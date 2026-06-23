package com.cps.mcp.config;

import com.embabel.agent.spi.LlmService;
import com.embabel.agent.spi.loop.LlmMessageSender;
import com.embabel.agent.spi.loop.LlmMessageResponse;
import com.embabel.agent.spi.loop.streaming.LlmMessageStreamer;
import com.embabel.chat.Message;
import com.embabel.chat.AssistantMessage;
import com.embabel.chat.AssistantMessageWithToolCalls;
import com.embabel.chat.ToolCall;
import com.embabel.agent.core.Usage;
import com.embabel.agent.api.tool.Tool;
import com.embabel.common.ai.model.LlmOptions;
import com.embabel.common.ai.model.ModelType;
import com.embabel.common.ai.model.PricingModel;
import com.embabel.common.ai.prompt.PromptContributor;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

public class DummyLlmService implements LlmService<DummyLlmService> {

    @Override
    public String getName() {
        return "gpt-4.1-mini";
    }

    @Override
    public String getProvider() {
        return "openai";
    }

    @Override
    public ModelType getType() {
        return ModelType.LLM;
    }

    @Override
    public LocalDate getKnowledgeCutoffDate() {
        return LocalDate.now();
    }

    @Override
    public PricingModel getPricingModel() {
        return PricingModel.getALL_YOU_CAN_EAT();
    }

    @Override
    public List<PromptContributor> getPromptContributors() {
        return Collections.emptyList();
    }

    @Override
    public LlmMessageSender createMessageSender(LlmOptions options) {
        return new LlmMessageSender() {
            @Override
            public LlmMessageResponse call(List<? extends Message> messages, List<? extends Tool> tools) {
                System.out.println("=== DummyLlmMessageSender call ===");
                System.out.println("  tools count: " + tools.size());
                for (Message msg : messages) {
                    System.out.println("  msg [" + msg.getRole() + "]: " + msg.getContent());
                }

                // Check if it's the ranking step or tools list is empty
                boolean isRanking = false;
                for (Message msg : messages) {
                    if (msg.getContent() != null && (msg.getContent().contains("rank") || msg.getContent().contains("Rank"))) {
                        isRanking = true;
                        break;
                    }
                }

                if (tools.isEmpty() || isRanking) {
                    boolean isTravel = false;
                    for (Message msg : messages) {
                        if (msg.getContent() != null) {
                            String content = msg.getContent();
                            int startIdx = content.indexOf("User input: <");
                            if (startIdx != -1) {
                                int endIdx = content.indexOf(">", startIdx);
                                if (endIdx != -1) {
                                    String userInput = content.substring(startIdx + "User input: <".length(), endIdx).toLowerCase();
                                    if (userInput.contains("trip") || 
                                        userInput.contains("jaipur") || 
                                        userInput.contains("prague") || 
                                        userInput.contains("tokyo") ||
                                        userInput.contains("rome") ||
                                        userInput.contains("berlin") ||
                                        userInput.contains("paris") ||
                                        userInput.contains("vienna") ||
                                        userInput.contains("travel")) {
                                        isTravel = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    String json;
                    if (isTravel) {
                        json = "{\"rankings\": [{\"name\": \"TravelPlannerAgent\", \"confidence\": 1.0}]}";
                        System.out.println("  Action: Ranking -> Returning TravelPlannerAgent JSON");
                    } else {
                        json = "{\"rankings\": [{\"name\": \"DemoAgent\", \"confidence\": 1.0}]}";
                        System.out.println("  Action: Ranking -> Returning DemoAgent JSON");
                    }
                    return new LlmMessageResponse(new AssistantMessage(json), json, new Usage(0, 0, null));
                }

                // Tool loop turn
                boolean hasToolOutput = false;
                for (Message msg : messages) {
                    if (msg.getContent() != null && msg.getContent().contains("Hello, Embabel!")) {
                        hasToolOutput = true;
                        break;
                    }
                }

                if (hasToolOutput) {
                    System.out.println("  Action: Tool execution completed -> Returning final answer");
                    return new LlmMessageResponse(new AssistantMessage("Hello, Embabel!"), "Hello, Embabel!", new Usage(0, 0, null));
                } else {
                    System.out.println("  Action: Tool execution needed -> Returning tool call to 'hello'");
                    ToolCall toolCall = new ToolCall("call_hello", "hello", "{}");
                    AssistantMessageWithToolCalls msg = new AssistantMessageWithToolCalls(List.of(toolCall));
                    return new LlmMessageResponse(msg, "", new Usage(0, 0, null));
                }
            }
        };
    }

    @Override
    public LlmMessageStreamer createMessageStreamer(LlmOptions options) {
        return null;
    }

    @Override
    public boolean supportsStreaming() {
        return false;
    }

    @Override
    public DummyLlmService withKnowledgeCutoffDate(LocalDate date) {
        return this;
    }

    @Override
    public DummyLlmService withPromptContributor(PromptContributor contributor) {
        return this;
    }
}
