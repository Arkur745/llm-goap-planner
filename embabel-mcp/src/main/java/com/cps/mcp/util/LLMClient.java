package com.cps.mcp.util;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import java.time.Duration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public class LLMClient {
    private static final String ENDPOINT = "http://localhost:11434/api/generate";

    public static String callLLM(String prompt) {
        try {
            HttpClient client = HttpClient.newHttpClient();
            String requestBody = "{\"model\":\"llama3\",\"prompt\":\"" + jsonEscape(prompt) + "\",\"stream\":false}";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(ENDPOINT))
                    .timeout(Duration.ofSeconds(45))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                System.err.println("Ollama Error (Status " + response.statusCode() + "): " + response.body());
                return "basic research data";
            }
            
            String body = response.body();
            
            // Use Jackson for reliable parsing and unescaping
            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(body);
            
            String text = null;
            String[] keys = {"response", "generated_text", "text", "output", "content"};
            for (String key : keys) {
                if (root.has(key)) {
                    text = root.get(key).asText();
                    break;
                }
            }

            if (text == null || text.isBlank()) {
                System.err.println("No text found in Ollama response: " + body);
                return "basic research data";
            }
            return text;
        } catch (Exception e) {
            System.err.println("LLM Call Error (" + e.getClass().getSimpleName() + "): " + e.getMessage());
            e.printStackTrace();
            return "basic research data";
        }
    }

    public static String simulateAgentExecution(String agentName, String task) {
        String prompt = "You are a specialized AI agent named " + agentName + ". " +
                        "Your job is to execute the following task and return a brief, realistic response (1-2 sentences) as if you just performed it.\n" +
                        "Task: " + task;
        return callLLM(prompt).trim();
    }

    private static String jsonEscape(String text) {
        return text.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
