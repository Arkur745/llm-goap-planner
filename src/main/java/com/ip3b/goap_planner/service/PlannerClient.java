package com.ip3b.goap_planner.service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ip3b.goap_planner.model.MermaidGanttTask;
import com.ip3b.goap_planner.model.PlanAssignment;
import com.ip3b.goap_planner.model.PlanResponse;
import com.ip3b.goap_planner.model.PlanStep;

@Component
public class PlannerClient {

    private static final String PLANNER_URL = "http://127.0.0.1:9090/plan";
    private static final ObjectMapper mapper = new ObjectMapper();

    /**
     * Call the internal planner `/plan` endpoint and map the response to a PlanResponse.
     * Returns null on error so the caller can fallback.
     */
    public PlanResponse generate(String goal, List<String> tools, String provider) {
        return generate(goal, tools, provider, "embabel");
    }

    public PlanResponse generate(String goal, List<String> tools, String provider, String runtime) {
        try {
            URL url = new URL(PLANNER_URL);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(300000);

            Map<String, Object> req = new java.util.HashMap<>();
            req.put("goal", goal);
            req.put("tools", tools != null ? tools : List.of());
            req.put("provider", provider != null ? provider : "auto");
            req.put("runtime", runtime != null ? runtime : "embabel");
            
            String payload = mapper.writeValueAsString(req);
            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = payload.getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }

            int code = conn.getResponseCode();
            if (code != HttpURLConnection.HTTP_OK) {
                System.err.println("PlannerClient: non-200 from planner: " + code);
                return null;
            }

            StringBuilder sb = new StringBuilder();
            try (BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = br.readLine()) != null) {
                    sb.append(line);
                }
            }

            String raw = sb.toString();
            Map<String, Object> data = mapper.readValue(raw, Map.class);

            // Build steps from either "steps" or "tasks"
            List<PlanStep> steps = new ArrayList<>();
            java.util.function.Function<java.util.Map, String> pickTitle = (m) -> {
                for (Object k : new Object[] {"title", "name", "task", "label"}) {
                    if (m.containsKey(k)) return m.get(k).toString();
                }
                return null;
            };

            java.util.function.Function<java.util.Map, String> pickDetails = (m) -> {
                for (Object k : new Object[] {"details", "description", "desc", "info", "body"}) {
                    if (m.containsKey(k)) return m.get(k).toString();
                }
                return "";
            };

            Object stepsObj = data.get("steps");
            List<?> listSource = null;
            if (stepsObj instanceof List) listSource = (List<?>) stepsObj;
            else if (data.get("tasks") instanceof List) listSource = (List<?>) data.get("tasks");
            else if (data.get("plan") instanceof Map && ((Map) data.get("plan")).get("tasks") instanceof List) {
                listSource = (List<?>) ((Map) data.get("plan")).get("tasks");
            }

            if (listSource != null) {
                for (int i = 0; i < listSource.size(); i++) {
                    Object item = listSource.get(i);
                    if (item instanceof Map) {
                        Map m = (Map) item;
                        int order = m.containsKey("order") ? ((Number) m.get("order")).intValue() : i + 1;
                        String title = pickTitle.apply(m);
                        if (title == null) title = "Step " + order;
                        String details = pickDetails.apply(m);
                        String agent = m.containsKey("agent") ? m.get("agent").toString() : "SearchAgent";
                        String output = m.containsKey("output") ? m.get("output").toString() : null;
                        steps.add(new PlanStep(order, title, details, agent, output));
                    } else {
                        steps.add(new PlanStep(i + 1, item.toString(), "", "SearchAgent", null));
                    }
                }
            }

            List<PlanAssignment> assignments = new ArrayList<>();
            String summary = data.getOrDefault("summary", "Plan generated by dynamic planner").toString();
            String flowchart = data.getOrDefault("flowchart", data.getOrDefault("mermaid", "")).toString();
            String gantt = data.getOrDefault("gantt", "").toString();
            String classification = data.containsKey("classification") ? data.get("classification").toString() : null;
            List<Map<String, Object>> trace = (List<Map<String, Object>>) data.get("trace");

            return new PlanResponse(
                    goal,
                    summary,
                    "Ready",
                    steps,
                    assignments,
                    flowchart,
                    gantt,
                    "PLANNER",
                    classification,
                    trace,
                    Instant.now()
            );

        } catch (Exception e) {
            System.err.println("PlannerClient: exception calling planner: " + e.getMessage());
            return null;
        }
    }
}
