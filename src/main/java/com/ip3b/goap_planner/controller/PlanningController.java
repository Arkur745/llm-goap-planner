package com.ip3b.goap_planner.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.ip3b.goap_planner.model.PlanRequest;
import com.ip3b.goap_planner.model.PlanResponse;
import com.ip3b.goap_planner.service.PlanService;

@RestController
@RequestMapping("/api/plans")
public class PlanningController {

    private final PlanService planService;

    public PlanningController(PlanService planService) {
        this.planService = planService;
    }

    @PostMapping
    public ResponseEntity<PlanResponse> generatePlan(@RequestBody(required = false) PlanRequest request) {
        if (request == null || request.goal() == null || request.goal().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Goal is required");
        }
        var result = planService.generatePlanWithSource(request);
        String source = result.source();
        PlanResponse body = result.response();

        return ResponseEntity.ok()
                .header("X-Plan-Source", source)
                .body(body);
    }
}