package com.cps.mcp.util;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class MCPClient {
    private static final String ENDPOINT = "http://localhost:9090/execute/calendar";

    public static String callCalendar(String task) {
        try {
            HttpClient client = HttpClient.newHttpClient();
            String requestBody = "{\"task\":\"" + jsonEscape(task) + "\"}";
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(ENDPOINT))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            String body = response.body();
            if (body == null || body.isBlank()) {
                return "not scheduled";
            }
            return body.trim();
        } catch (Exception e) {
            return "not scheduled";
        }
    }

    private static String jsonEscape(String text) {
        return text.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }
}
