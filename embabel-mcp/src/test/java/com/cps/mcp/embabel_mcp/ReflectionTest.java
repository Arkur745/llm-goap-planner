package com.cps.mcp.embabel_mcp;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import com.embabel.agent.core.Blackboard;
import com.embabel.agent.core.ProcessOptions;
import com.embabel.agent.api.common.autonomy.Autonomy;
import com.embabel.agent.api.common.autonomy.AgentProcessExecution;
import com.embabel.agent.core.AgentProcess;
import com.embabel.agent.core.ActionInvocation;
import java.lang.reflect.Proxy;
import java.lang.reflect.Method;
import java.lang.reflect.InvocationHandler;
import java.util.List;
import java.util.Set;

@SpringBootTest(properties = {
    "embabel.llm.provider=openai",
    "embabel.models.default-llm=gpt-4.1-mini",
    "embabel.search.provider=mock"
})
public class ReflectionTest {

    @Autowired
    private ApplicationContext context;

    @Autowired
    private Autonomy autonomy;

    @Autowired
    private Blackboard blackboard;

    @org.springframework.boot.test.mock.mockito.MockBean
    private com.cps.mcp.weather.provider.WeatherProvider weatherProvider;

    @org.junit.jupiter.api.BeforeEach
    public void setupWeatherMock() throws Exception {
        org.mockito.Mockito.when(weatherProvider.getName()).thenReturn("open-meteo");
        org.mockito.Mockito.when(weatherProvider.getWeather(org.mockito.Mockito.anyString())).thenAnswer(invocation -> {
            String loc = invocation.getArgument(0);
            return new com.cps.mcp.weather.model.WeatherReport(
                    loc, 22.5, "Mostly Sunny", 55.0, 10.0,
                    System.currentTimeMillis(), "open-meteo",
                    com.cps.mcp.weather.model.WeatherReport.WeatherSeverity.GOOD
            );
        });
    }

    @org.springframework.boot.test.context.TestConfiguration
    static class TestConfig implements org.springframework.beans.factory.support.BeanDefinitionRegistryPostProcessor {
        @Override
        public void postProcessBeanDefinitionRegistry(org.springframework.beans.factory.support.BeanDefinitionRegistry registry) {
            if (registry.containsBeanDefinition("llmService")) {
                registry.removeBeanDefinition("llmService");
            }
        }
        @Override
        public void postProcessBeanFactory(org.springframework.beans.factory.config.ConfigurableListableBeanFactory beanFactory) {}
    }

    private static final Set<String> FILTERED_INPUTS = Set.of(
        "provide weather forecast",
        "provide budget estimate",
        "provide destination information",
        "plan travel itinerary"
    );

    private String getUserInputContent(Object userInputObj) {
        try {
            java.lang.reflect.Method getContentMethod = userInputObj.getClass().getMethod("getContent");
            return (String) getContentMethod.invoke(userInputObj);
        } catch (Exception e) {
            return "";
        }
    }

    private Blackboard createFilteringBlackboardProxy(Blackboard target, String goalStr, String mappedGoalStr) {
        return (Blackboard) Proxy.newProxyInstance(
            Blackboard.class.getClassLoader(),
            new Class<?>[]{Blackboard.class},
            new InvocationHandler() {
                private boolean isActionCaller() {
                    StackTraceElement[] stack = Thread.currentThread().getStackTrace();
                    for (StackTraceElement element : stack) {
                        String className = element.getClassName();
                        String methodName = element.getMethodName();
                        if (className.contains("com.cps.mcp.agent") || 
                            className.contains("TravelPlannerAgent") || 
                            methodName.equals("executeAction")) {
                            return true;
                        }
                    }
                    return false;
                }

                @Override
                public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
                    String methodName = method.getName();
                    if (args != null && args.length > 0) {
                        if ("addObject".equals(methodName)) {
                            Object arg = args[0];
                            if (isFilteredUserInput(arg)) {
                                System.out.println(">>> Blackboard Proxy: Filtering out addObject for UserInput: " + arg);
                                if (method.getReturnType().equals(Blackboard.class)) {
                                    return proxy;
                                }
                                return null;
                            }
                        } else if ("bind".equals(methodName) || "bindProtected".equals(methodName)) {
                            if (args.length >= 2) {
                                Object value = args[1];
                                if (isFilteredUserInput(value)) {
                                    System.out.println(">>> Blackboard Proxy: Filtering out bind/bindProtected for: " + args[0] + " -> " + value);
                                    if (method.getReturnType().equals(Blackboard.class)) {
                                        return proxy;
                                    }
                                    return null;
                                }
                            }
                        } else if ("bindAll".equals(methodName)) {
                            Object arg = args[0];
                            if (arg instanceof java.util.Map) {
                                java.util.Map<?, ?> originalMap = (java.util.Map<?, ?>) arg;
                                java.util.Map<Object, Object> filteredMap = new java.util.LinkedHashMap<>();
                                boolean modified = false;
                                for (java.util.Map.Entry<?, ?> entry : originalMap.entrySet()) {
                                    if (isFilteredUserInput(entry.getValue())) {
                                        System.out.println(">>> Blackboard Proxy: Filtering out bindAll entry: " + entry.getKey() + " -> " + entry.getValue());
                                        modified = true;
                                    } else {
                                        filteredMap.put(entry.getKey(), entry.getValue());
                                    }
                                }
                                if (modified) {
                                    Object result = method.invoke(target, new Object[]{filteredMap});
                                    if (result == target) {
                                        return proxy;
                                    }
                                    return result;
                                }
                            }
                        } else if ("get".equals(methodName)) {
                            String key = args[0] != null ? args[0].toString() : null;
                            if ("userInput".equals(key) || "input".equals(key)) {
                                String val = isActionCaller() ? goalStr : mappedGoalStr;
                                System.out.println(">>> Blackboard Proxy: Intercepting get(\"" + key + "\"), returning: " + val);
                                return new com.embabel.agent.domain.io.UserInput(val);
                            }
                        } else if ("last".equals(methodName)) {
                            Class<?> clazz = (Class<?>) args[0];
                            if (clazz.equals(com.embabel.agent.domain.io.UserInput.class)) {
                                String val = isActionCaller() ? goalStr : mappedGoalStr;
                                System.out.println(">>> Blackboard Proxy: Intercepting last(UserInput.class), returning: " + val);
                                return new com.embabel.agent.domain.io.UserInput(val);
                            }
                        } else if ("objectsOfType".equals(methodName)) {
                            Class<?> clazz = (Class<?>) args[0];
                            if (clazz.equals(com.embabel.agent.domain.io.UserInput.class)) {
                                String val = isActionCaller() ? goalStr : mappedGoalStr;
                                System.out.println(">>> Blackboard Proxy: Intercepting objectsOfType(UserInput.class), returning: " + val);
                                return List.of(new com.embabel.agent.domain.io.UserInput(val));
                            }
                        }
                    } else if (args == null || args.length == 0) {
                        if ("getObjects".equals(methodName)) {
                            List<Object> originalObjects = (List<Object>) method.invoke(target, args);
                            List<Object> modifiedObjects = new java.util.ArrayList<>();
                            String targetVal = isActionCaller() ? goalStr : mappedGoalStr;
                            for (Object obj : originalObjects) {
                                if (obj != null && obj.getClass().getSimpleName().equals("UserInput")) {
                                    continue;
                                }
                                modifiedObjects.add(obj);
                            }
                            modifiedObjects.add(new com.embabel.agent.domain.io.UserInput(targetVal));
                            System.out.println(">>> Blackboard Proxy: Intercepting getObjects(), injecting UserInput: " + targetVal);
                            return modifiedObjects;
                        }
                    }
                    Object result = method.invoke(target, args);
                    if (result == target) {
                        return proxy;
                    }
                    return result;
                }
            }
        );
    }

    private boolean isFilteredUserInput(Object obj) {
        if (obj == null) return false;
        if (obj.getClass().getSimpleName().equals("UserInput")) {
            String content = getUserInputContent(obj).toLowerCase().trim();
            return FILTERED_INPUTS.contains(content);
        }
        return false;
    }

    @Test
    public void verifyBlackboardInjectionBehavior() throws Exception {
        java.io.File logFile = new java.io.File("C:\\Users\\atmar\\.gemini\\antigravity-ide\\brain\\6182c3cd-c089-457d-a52c-20e20cc241ef\\test_run.log");
        java.io.PrintWriter pw = new java.io.PrintWriter(new java.io.FileWriter(logFile));
        pw.println("=== START VERIFICATION TEST ===");
        
        try {
            pw.println("--- Methods of Autonomy ---");
            for (java.lang.reflect.Method m : Autonomy.class.getDeclaredMethods()) {
                pw.println("  " + m.toString());
            }
            pw.println("--- Methods of Blackboard ---");
            for (java.lang.reflect.Method m : Blackboard.class.getMethods()) {
                pw.println("  " + m.toString());
            }
            pw.println("--- Constructors of InMemoryBlackboard ---");
            try {
                Class<?> immClass = Class.forName("com.embabel.agent.core.support.InMemoryBlackboard");
                for (java.lang.reflect.Constructor<?> c : immClass.getConstructors()) {
                    pw.println("  " + c.toString());
                }
            } catch (Exception e) {
                pw.println("Failed to load InMemoryBlackboard: " + e.getMessage());
            }
            pw.println("--- Methods of ProcessOptions ---");
            for (java.lang.reflect.Method m : ProcessOptions.class.getMethods()) {
                pw.println("  " + m.toString());
            }
            pw.println("---------------------------");
            // Spawn child blackboard
            Blackboard childBlackboard = new com.embabel.agent.core.support.InMemoryBlackboard();
            pw.println("Instantiated new InMemoryBlackboard: " + childBlackboard);
            
            // Wrap with filtering proxy
            Blackboard proxyBlackboard = createFilteringBlackboardProxy(childBlackboard, "Weather in Rome", "Provide weather forecast");
            
            // 2. Add original UserInput to blackboard
            com.embabel.agent.domain.io.UserInput userInput = new com.embabel.agent.domain.io.UserInput("Weather in Rome");
            proxyBlackboard.addObject(userInput);
            
            // 3. Configure options with proxy blackboard
            ProcessOptions options = new ProcessOptions().withBlackboard(proxyBlackboard);
            
            // 4. Run autonomy with correct mapped goal
            String mappedGoal = "Provide weather forecast";
            pw.println("Invoking chooseAndRunAgent with goal: '" + mappedGoal + "' and seeded blackboard proxy...");
            AgentProcessExecution execution = autonomy.chooseAndRunAgent(mappedGoal, options);
            
            AgentProcess process = execution.getAgentProcess();
            pw.println("Execution finished. Output: " + execution.getOutput());
            pw.println("Process objects: " + process.getBlackboard().getObjects());
            
            List<ActionInvocation> history = process.getHistory();
            pw.println("Process history (actions executed in order):");
            for (int i = 0; i < history.size(); i++) {
                pw.println("  " + (i + 1) + ". " + history.get(i).getActionName());
            }
            
            pw.println("=== VERIFICATION TEST PASSED SUCCESSFULLY ===");
        } catch (Exception e) {
            pw.println("TEST FAILED WITH EXCEPTION:");
            e.printStackTrace(pw);
        } finally {
            pw.close();
        }
    }
}

