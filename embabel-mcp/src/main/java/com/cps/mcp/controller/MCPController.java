package com.cps.mcp.embabel_mcp.controller;

import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/execute")
public class MCPController {

    @PostMapping("/calendar")
    public Map<String, Object> calendar(@RequestBody Map<String, String> body) {
        String task = body.get("task");

        String scheduledTime = "Tomorrow 11:00 AM";
        String taskLower = task.toLowerCase();
        if (taskLower.contains("meeting")) {
            scheduledTime = "Next weekday at 10:00 AM";
        } else if (taskLower.contains("event") || taskLower.contains("party")) {
            scheduledTime = "Saturday 6:00 PM";
        } else if (taskLower.contains("urgent")) {
            scheduledTime = "Today within 2 hours";
        }

        return Map.of(
                "server", "CalendarMCP",
                "action", "schedule",
                "task", task,
                "scheduled_time", scheduledTime,
                "status", "scheduled"
        );
    }

    @PostMapping("/budget")
    public Map<String, Object> budget(@RequestBody Map<String, String> body) {
        String task = body.get("task");

        int cost = 0;
        String confidence = "low";
        String taskLower = task.toLowerCase();

        if (taskLower.contains("presentation")) {
            cost += 350;
            confidence = "medium";
        }
        if (taskLower.contains("event") || taskLower.contains("party")) {
            cost += 1250;
            confidence = "high";
        }
        if (taskLower.contains("meeting")) {
            cost += 100;
            confidence = "medium";
        }
        if (taskLower.contains("travel")) {
            cost += 650;
            confidence = "medium";
        }
        if (cost == 0) {
            cost = 100;
            confidence = "low";
        }

        return Map.of(
                "estimated_cost", cost,
                "confidence", confidence
        );
    }

    @PostMapping("/resource")
    public Map<String, Object> resource(@RequestBody Map<String, String> body) {
        String task = body.get("task");

        List<String> resources = new ArrayList<>();
        String taskLower = task.toLowerCase();

        if (taskLower.contains("presentation")) {
            resources.addAll(Arrays.asList("slides", "projector", "laptop"));
        }
        if (taskLower.contains("party")) {
            resources.addAll(Arrays.asList("food", "drinks", "decorations"));
        }
        if (taskLower.contains("meeting")) {
            resources.addAll(Arrays.asList("room", "calendar", "notes"));
        }
        if (taskLower.contains("travel")) {
            resources.addAll(Arrays.asList("tickets", "hotel", "itinerary"));
        }
        if (resources.isEmpty()) {
            resources.add("general resources");
        }

        return Map.of(
                "server", "ResourceMCP",
                "action", "allocate",
                "task", task,
                "resources", resources,
                "status", "prepared"
        );
    }

    @PostMapping("/embabel")
    public Map<String, Object> embabel(@RequestBody Map<String, String> body) {
        String task = body.get("task");

        List<String> steps = new ArrayList<>();
        steps.add("Analyze and understand the task: " + task);
        steps.add("Plan the approach for executing: " + task);
        steps.add("Execute the main actions for: " + task);
        steps.add("Review and verify completion of: " + task);

        return Map.of(
                "server", "EmbabelMCP",
                "action", "decompose",
                "task", task,
                "steps", steps,
                "status", "generated"
        );
    }
}