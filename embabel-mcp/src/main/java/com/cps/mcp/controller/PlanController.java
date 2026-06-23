package com.cps.mcp.controller;

import org.springframework.web.bind.annotation.*;
import java.util.*;
import com.embabel.agent.api.common.autonomy.Autonomy;
import com.embabel.agent.api.common.autonomy.AgentProcessExecution;
import com.embabel.agent.core.AgentProcess;
import com.embabel.agent.core.ProcessOptions;
import com.embabel.agent.core.ActionInvocation;

@RestController
public class PlanController {

    private final Autonomy autonomy;

    public PlanController(Autonomy autonomy) {
        this.autonomy = autonomy;
    }

    @PostMapping("/plan")
    public Map<String, Object> plan(@RequestBody Map<String, Object> body) {
        String goalStr = (String) body.get("goal");
        if (goalStr == null || goalStr.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                "Goal is required"
            );
        }

        try {
            return executeEmbabelPlanner(goalStr);
        } catch (IllegalArgumentException ex) {
            System.err.println("PlanController: Validation error: " + ex.getMessage());
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.BAD_REQUEST,
                ex.getMessage(),
                ex
            );
        } catch (Exception ex) {
            System.err.println("PlanController: Embabel execution failed: " + ex.getMessage());
            ex.printStackTrace();
            throw new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                ex.getMessage(),
                ex
            );
        }
    }

    private Map<String, Object> executeEmbabelPlanner(String goalStr) throws Exception {
        AgentProcessExecution execution = autonomy.chooseAndRunAgent(goalStr, new ProcessOptions());
        AgentProcess process = execution.getAgentProcess();

        Class<?> agentClass = com.cps.mcp.agent.TravelPlannerAgent.class;
        List<ActionInvocation> history = process.getHistory();
        if (!history.isEmpty()) {
            String firstAction = history.get(0).getActionName();
            int lastDot = firstAction.lastIndexOf('.');
            if (lastDot != -1) {
                try {
                    agentClass = Class.forName(firstAction.substring(0, lastDot));
                } catch (Exception e) {
                    // ignore
                }
            }
        }

        List<Map<String, Object>> steps = com.cps.mcp.util.EmbabelTraceMapper.mapSteps(agentClass, process);
        List<Map<String, Object>> trace = com.cps.mcp.util.EmbabelTraceMapper.mapTrace(agentClass, process);
        String mermaidDiagram = com.cps.mcp.util.EmbabelGraphBuilder.generateMermaidDiagram(agentClass);

        String summary = "";
        Object finalReport = null;
        for (Object obj : process.getObjects()) {
            if ("TravelPlanReport".equals(obj.getClass().getSimpleName())) {
                finalReport = obj;
            }
        }

        if (finalReport != null) {
            summary = com.cps.mcp.util.EmbabelTraceMapper.formatOutput(finalReport);
        } else {
            Object output = execution.getOutput();
            summary = output != null ? output.toString() : "";
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("goal", goalStr);
        response.put("classification", "embabel_runtime");
        response.put("status", "COMPLETED");
        response.put("steps", steps);
        response.put("trace", trace);
        response.put("mermaidDiagram", mermaidDiagram);
        response.put("summary", summary);
        response.put("source", "EMBABEL");

        return response;
    }
}