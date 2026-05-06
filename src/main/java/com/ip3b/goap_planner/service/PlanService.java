package com.ip3b.goap_planner.service;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;

import org.springframework.stereotype.Service;

import com.ip3b.goap_planner.model.MermaidGanttTask;
import com.ip3b.goap_planner.model.PlanAssignment;
import com.ip3b.goap_planner.model.PlanRequest;
import com.ip3b.goap_planner.model.PlanResponse;
import com.ip3b.goap_planner.model.PlanStep;
import com.ip3b.goap_planner.visualization.MermaidPlanDiagramFactory;
import com.ip3b.goap_planner.service.LLMPlanGenerator.LLMPlanResult;

@Service
public class PlanService {

    private final MermaidPlanDiagramFactory diagramFactory;
    private final LLMPlanGenerator llmPlanGenerator;
    private final PlannerClient plannerClient;

    public PlanService(MermaidPlanDiagramFactory diagramFactory, LLMPlanGenerator llmPlanGenerator, PlannerClient plannerClient) {
        this.diagramFactory = diagramFactory;
        this.llmPlanGenerator = llmPlanGenerator;
        this.plannerClient = plannerClient;
    }

    public record PlanWithSource(String source, PlanResponse response) {}

    public PlanWithSource generatePlanWithSource(PlanRequest request) {
        String goal = normalizeGoal(request == null ? null : request.goal());

        // Try Python planner API first
        try {
            PlanResponse plannerResp = plannerClient.generate(goal);
            if (plannerResp != null) {
                return new PlanWithSource("PLANNER", plannerResp);
            }
        } catch (Exception e) {
            System.err.println("PlanService: planner client error: " + e.getMessage());
        }

        // Try LLM-based generation as fallback
        LLMPlanResult llmResult = llmPlanGenerator.generatePlanWithLLM(goal);
        if (llmResult != null) {
                PlanResponse resp = new PlanResponse(
                    llmResult.goal,
                    llmResult.summary,
                    "Ready",
                    llmResult.steps,
                    llmResult.assignments,
                    llmResult.mermaidDiagram,
                    llmResult.ganttDiagram,
                    "LLM",
                    Instant.now());

                return new PlanWithSource("LLM", resp);
        }

        // Fall back to blueprint-based planning
        String lowerGoal = goal.toLowerCase();
        PlanBlueprint blueprint = selectBlueprint(lowerGoal, goal);

        PlanResponse resp = new PlanResponse(
            goal,
            blueprint.summary(),
            "Ready",
            blueprint.steps(),
            blueprint.assignments(),
            blueprint.mermaidDiagram(),
            blueprint.ganttDiagram(),
            "BLUEPRINT",
            Instant.now());

        return new PlanWithSource("BLUEPRINT", resp);
    }

    // Backwards-compatible convenience method
    public PlanResponse generatePlan(PlanRequest request) {
        return generatePlanWithSource(request).response();
    }

    private PlanBlueprint selectBlueprint(String lowerGoal, String goal) {
        if (containsAny(lowerGoal, "hackathon", "hack-a-thon", "hack day")) {
            return buildHackathonBlueprint(goal);
        }

        if (containsAny(lowerGoal, "mobile app", "app launch", "launch app", "release app")) {
            return buildMobileAppBlueprint(goal);
        }

        if (containsAny(lowerGoal, "birthday", "party", "celebration")) {
            return buildBirthdayPartyBlueprint(goal);
        }

        return buildGenericBlueprint(goal);
    }

    private String normalizeGoal(String goal) {
        if (goal == null) {
            return "";
        }
        return goal.trim();
    }

    private PlanBlueprint buildHackathonBlueprint(String goal) {
        List<PlanStep> steps = Arrays.asList(
                new PlanStep(1, "Define challenge scope", "Pick a theme, success criteria, and team roles before coding starts."),
                new PlanStep(2, "Split into workstreams", "Assign prototype, pitch, and demo responsibilities so progress can happen in parallel."),
                new PlanStep(3, "Build a demoable core", "Ship the smallest feature set that clearly proves the idea."),
                new PlanStep(4, "Polish the pitch and fallback plan", "Prepare a crisp presentation, backup screenshots, and a stable demo path."));

        List<PlanAssignment> assignments = Arrays.asList(
                new PlanAssignment(1, "Define challenge scope", "ResearchAgent", "Research and analysis", "Ready", "CoordinationAgent", "Collects the brief, constraints, and judging criteria."),
                new PlanAssignment(2, "Split into workstreams", "CoordinationAgent", "Task orchestration", "Queued", "BuildAgent", "Keeps the team aligned on parallel tasks and handoffs."),
                new PlanAssignment(3, "Build a demoable core", "BuildAgent", "Rapid prototyping", "In progress", "PitchAgent", "Turns the core idea into a working prototype."),
                new PlanAssignment(4, "Polish the pitch and fallback plan", "PitchAgent", "Presentation refinement", "Queued", "FinalReviewAgent", "Shapes the final story and demo backup path."));

        List<MermaidGanttTask> ganttTasks = Arrays.asList(
                new MermaidGanttTask("Scope", "Define challenge scope (ResearchAgent)", "hackathon_scope", 0, 1),
                new MermaidGanttTask("Coordination", "Split workstreams (CoordinationAgent)", "hackathon_coordination", 1, 1),
                new MermaidGanttTask("Build", "Build demo core (BuildAgent)", "hackathon_build", 1, 2),
                new MermaidGanttTask("Pitch", "Polish pitch and fallback plan (PitchAgent)", "hackathon_pitch", 3, 1));

        String summary = "This hackathon plan prioritizes scope control, parallel execution, and a demo that survives presentation-day surprises.";
        return new PlanBlueprint(summary, steps, assignments, diagramFactory.buildFlowchart(goal, steps), diagramFactory.buildGantt(goal, ganttTasks));
    }

    private PlanBlueprint buildMobileAppBlueprint(String goal) {
        List<PlanStep> steps = Arrays.asList(
                new PlanStep(1, "Clarify product promise", "Define the user problem, target audience, and the one thing the app must do well."),
                new PlanStep(2, "Map the first release", "Choose a lean MVP, the onboarding path, and the analytics events to track."),
                new PlanStep(3, "Build and validate flows", "Implement the core screens, connect the backend, and test the happy path on real devices."),
                new PlanStep(4, "Prepare launch assets", "Finish store copy, screenshots, release notes, and the rollout checklist."),
                new PlanStep(5, "Monitor post-launch signals", "Watch crashes, reviews, and retention to decide the first iteration."));

        List<PlanAssignment> assignments = Arrays.asList(
                new PlanAssignment(1, "Clarify product promise", "ProductAgent", "Product framing", "Ready", "DesignAgent", "Frames the user problem and MVP outcome."),
                new PlanAssignment(2, "Map the first release", "DesignAgent", "UX flow design", "Queued", "IntegrationAgent", "Shapes the launch path and screens around the MVP."),
                new PlanAssignment(3, "Build and validate flows", "IntegrationAgent", "Cross-system integration", "In progress", "LaunchAgent", "Connects screens, backend, and device validation."),
                new PlanAssignment(4, "Prepare launch assets", "LaunchAgent", "Release coordination", "Queued", "MetricsAgent", "Packages store listing and release materials."),
                new PlanAssignment(5, "Monitor post-launch signals", "MetricsAgent", "Telemetry and feedback analysis", "Waiting", "ProductAgent", "Tracks crashes, reviews, and retention after release."));

        List<MermaidGanttTask> ganttTasks = Arrays.asList(
                new MermaidGanttTask("Product", "Clarify product promise (ProductAgent)", "app_product", 0, 1),
                new MermaidGanttTask("Design", "Map first release (DesignAgent)", "app_design", 1, 2),
                new MermaidGanttTask("Build", "Build and validate flows (IntegrationAgent)", "app_build", 2, 3),
                new MermaidGanttTask("Launch", "Prepare launch assets (LaunchAgent)", "app_launch", 5, 1),
                new MermaidGanttTask("Observe", "Monitor post-launch signals (MetricsAgent)", "app_metrics", 6, 2));

        String summary = "This mobile app plan focuses on product clarity, a minimal launch scope, and the post-release feedback loop.";
        return new PlanBlueprint(summary, steps, assignments, diagramFactory.buildFlowchart(goal, steps).replace("flowchart TD", "flowchart LR"), diagramFactory.buildGantt(goal, ganttTasks));
    }

    private PlanBlueprint buildBirthdayPartyBlueprint(String goal) {
        List<PlanStep> steps = Arrays.asList(
                new PlanStep(1, "Lock the guest list", "Confirm who is invited, how many people are coming, and any special needs."),
                new PlanStep(2, "Reserve the venue and timing", "Choose the space, set the date, and make sure arrival and setup windows are realistic."),
                new PlanStep(3, "Plan food, cake, and activities", "Coordinate the menu, order the cake, and pick a few easy crowd-pleasers."),
                new PlanStep(4, "Send reminders and prep supplies", "Confirm RSVPs, buy decorations, and pack the items needed on the day."));

        List<PlanAssignment> assignments = Arrays.asList(
                new PlanAssignment(1, "Lock the guest list", "CalendarAgent", "Scheduling and RSVP tracking", "Ready", "VenueAgent", "Tracks RSVPs, timing, and guest constraints."),
                new PlanAssignment(2, "Reserve the venue and timing", "VenueAgent", "Venue coordination", "Queued", "EventsAgent", "Checks location availability and setup windows."),
                new PlanAssignment(3, "Plan food, cake, and activities", "EventsAgent", "Event planning", "In progress", "MailAgent", "Coordinates menu, entertainment, and cake ordering."),
                new PlanAssignment(4, "Send reminders and prep supplies", "MailAgent", "Invitations and reminders", "Queued", "CalendarAgent", "Handles invitations, reminders, and day-of supplies."));

        List<MermaidGanttTask> ganttTasks = Arrays.asList(
                new MermaidGanttTask("Setup", "Lock guest list (CalendarAgent)", "party_guests", 0, 1),
                new MermaidGanttTask("Setup", "Reserve venue and timing (VenueAgent)", "party_venue", 0, 2),
                new MermaidGanttTask("Food & Fun", "Plan food, cake, and activities (EventsAgent)", "party_food", 1, 2),
                new MermaidGanttTask("Reminder", "Send reminders and prep supplies (MailAgent)", "party_reminders", 2, 1));

        String summary = "This birthday party plan emphasizes logistics, guest coordination, and the small details that make the event feel effortless.";
        return new PlanBlueprint(summary, steps, assignments, diagramFactory.buildFlowchart(goal, steps), diagramFactory.buildGantt(goal, ganttTasks));
    }

    private PlanBlueprint buildGenericBlueprint(String goal) {
        List<PlanStep> steps = Arrays.asList(
                new PlanStep(1, "Define the outcome", "Turn the goal into one measurable result that can be checked later."),
                new PlanStep(2, "List constraints and inputs", "Identify the people, tools, time, and dependencies that shape the plan."),
                new PlanStep(3, "Sequence the actions", "Order the work from prerequisites to execution in the smallest viable chain."),
                new PlanStep(4, "Review and adapt", "Compare the result with the goal and decide the next adjustment."));

        List<PlanAssignment> assignments = Arrays.asList(
                new PlanAssignment(1, "Define the outcome", "PlannerAgent", "Goal decomposition", "Ready", "AnalyzerAgent", "Turns the goal into a checkable result."),
                new PlanAssignment(2, "List constraints and inputs", "AnalyzerAgent", "Constraint analysis", "Queued", "OrchestratorAgent", "Collects the conditions and dependencies around the goal."),
                new PlanAssignment(3, "Sequence the actions", "OrchestratorAgent", "Execution routing", "In progress", "ReviewAgent", "Orders the steps into a viable execution path."),
                new PlanAssignment(4, "Review and adapt", "ReviewAgent", "Quality review", "Waiting", "PlannerAgent", "Checks the result and recommends the next change."));

        List<MermaidGanttTask> ganttTasks = Arrays.asList(
                new MermaidGanttTask("Analysis", "Define the outcome (PlannerAgent)", "generic_define", 0, 1),
                new MermaidGanttTask("Analysis", "List constraints and inputs (AnalyzerAgent)", "generic_analyze", 1, 1),
                new MermaidGanttTask("Execution", "Sequence the actions (OrchestratorAgent)", "generic_sequence", 2, 2),
                new MermaidGanttTask("Review", "Review and adapt (ReviewAgent)", "generic_review", 4, 1));

        String summary = "This starter plan adapts the action sequence to the supplied goal using a simple GOAP-style breakdown.";
        return new PlanBlueprint(summary, steps, assignments, diagramFactory.buildFlowchart(goal, steps), diagramFactory.buildGantt(goal, ganttTasks));
    }

    private boolean containsAny(String text, String... candidates) {
        for (String candidate : candidates) {
            if (text.contains(candidate)) {
                return true;
            }
        }

        return false;
    }

    private record PlanBlueprint(
            String summary,
            List<PlanStep> steps,
            List<PlanAssignment> assignments,
            String mermaidDiagram,
            String ganttDiagram) {
    }
}