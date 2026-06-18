# Adding Custom Tools to the Embabel MCP Backend

This guide details the steps required to register new tools in the Embabel MCP backend.

---

## 1. ToolGroup Architecture

In the Embabel framework, tools are not declared as loose functions. Instead, they are collected into **Tool Groups** that implement the `com.embabel.agent.core.ToolGroup` interface.

```java
public interface ToolGroup {
    ToolGroupMetadata getMetadata();
    List<Tool> getTools();
}
```

### Bypassing Kotlin Inline Mangling via Java Dynamic Proxy
The metadata interface `ToolGroupMetadata` features methods compiled in Kotlin that compile to name-mangled identifiers (such as `getVersion-Id9oKnY()`) on the JDK bytecode layer. 
To bypass compilation errors and runtime compatibility issues in Java, we instantiate the metadata using `java.lang.reflect.Proxy`:

```java
this.metadata = (ToolGroupMetadata) Proxy.newProxyInstance(
        ToolGroupMetadata.class.getClassLoader(),
        new Class<?>[]{ToolGroupMetadata.class},
        (proxy, method, args) -> {
            switch (method.getName()) {
                case "getRole":
                    return "search";
                case "getDescription":
                    return "Search the web and summarize search results";
                case "getName":
                    return "SearchToolGroup";
                case "getProvider":
                    return "local";
                case "getPermissions":
                    return Collections.emptySet();
                case "infoString":
                    return "SearchToolGroup 1.0.0";
                default:
                    if (method.getName().contains("getVersion")) {
                        return "1.0.0";
                    }
                    return null;
            }
        }
);
```

---

## 2. Tool Registration Workflow

1. **Implement `ToolGroup`**: Create a new class implementing the interface.
2. **Annotate with `@Component`**: Register it as a Spring-managed bean.
3. **Declare Tools inside `getTools()`**: Use `Tool.fromFunction(...)` or generic factory methods to build tools with clear parameters, titles, descriptions, and handlers.

---

## 3. Reference Implementations

### A. Search Tool Group (`SearchToolGroup.java`)
Exposes search functions using Tavily or mock search providers.
```java
@Override
public List<Tool> getTools() {
    Tool searchTool = Tool.fromFunction(
            "search",
            "Executes a web search query and returns structured results",
            String.class,
            String.class,
            query -> {
                SearchResponse response = searchProvider.search(query);
                return formatResponse(response);
            }
    );
    return List.of(searchTool);
}
```

### B. Weather Tool Group (`WeatherToolGroup.java`)
Exposes weather search tools by resolving coordinate geocoding via Open-Meteo REST endpoints.
```java
@Override
public List<Tool> getTools() {
    Tool weatherTool = Tool.fromFunction(
            "get_weather",
            "Fetches weather forecast for a location",
            String.class,
            String.class,
            location -> {
                WeatherReport report = weatherProvider.getWeather(location);
                return formatWeatherReport(report);
            }
    );
    return List.of(weatherTool);
}
```

---

## 4. Example: Implementing a Custom Tool

Below is an example of creating a new `NotifierToolGroup` that notifies users by email:

```java
package com.cps.mcp.tool;

import com.embabel.agent.core.ToolGroup;
import com.embabel.agent.core.ToolGroupMetadata;
import com.embabel.agent.api.tool.Tool;
import org.springframework.stereotype.Component;
import java.lang.reflect.Proxy;
import java.util.Collections;
import java.util.List;

@Component
public class NotifierToolGroup implements ToolGroup {

    private final ToolGroupMetadata metadata;

    public NotifierToolGroup() {
        this.metadata = (ToolGroupMetadata) Proxy.newProxyInstance(
                ToolGroupMetadata.class.getClassLoader(),
                new Class<?>[]{ToolGroupMetadata.class},
                (proxy, method, args) -> {
                    switch (method.getName()) {
                        case "getRole": return "notification";
                        case "getDescription": return "Sends notification emails";
                        case "getName": return "NotifierToolGroup";
                        case "getProvider": return "local";
                        case "getPermissions": return Collections.emptySet();
                        default:
                            if (method.getName().contains("getVersion")) return "1.0.0";
                            return null;
                    }
                }
        );
    }

    @Override
    public ToolGroupMetadata getMetadata() {
        return metadata;
    }

    @Override
    public List<Tool> getTools() {
        Tool sendEmailTool = Tool.fromFunction(
                "send_email",
                "Sends a plan summary email to a guest",
                String.class, // Parameter: guest email
                String.class, // Return: status string
                email -> {
                    System.out.println("Email sent to " + email);
                    return "Email notification sent successfully to " + email;
                }
        );
        return List.of(sendEmailTool);
    }
}
```

---

## 5. Testing Custom Tools

Tools must be validated by running unit tests checking registration, execution parameters, and outputs:

```java
public class NotifierToolGroupTests {
    @Test
    public void testNotifierToolRegistration() {
        NotifierToolGroup group = new NotifierToolGroup();
        assertEquals("NotifierToolGroup", group.getMetadata().getName());
        assertEquals(1, group.getTools().size());
        
        Tool sendEmail = group.getTools().get(0);
        assertEquals("send_email", sendEmail.getName());
    }
}
```
For integration testing, verify that the Spring Application context starts successfully and registers the Tool Group automatically.
