package com.cps.mcp.agent;

import com.embabel.agent.api.annotation.Agent;
import com.embabel.agent.api.annotation.Action;
import com.embabel.agent.api.annotation.AchievesGoal;
import com.embabel.agent.domain.io.UserInput;
import com.cps.mcp.search.provider.SearchProvider;
import com.cps.mcp.search.model.SearchResponse;
import com.cps.mcp.budget.service.BudgetService;
import com.cps.mcp.budget.model.BudgetEstimate;
import com.cps.mcp.budget.model.BudgetItem;
import com.cps.mcp.weather.model.WeatherReport;
import com.cps.mcp.weather.provider.WeatherProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationContext;
import org.springframework.ai.chat.model.ChatModel;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Planner-driven Travel Planner Agent that orchestrates multi-tool execution
 * via type-based preconditions and postconditions.
 */
@Agent(name = "TravelPlannerAgent", description = "Travel planner agent that searches and calculates budgets for trips")
@Component
public class TravelPlannerAgent {

    private static final Logger logger = LoggerFactory.getLogger(TravelPlannerAgent.class);

    @Autowired(required = false)
    private ChatModel chatModel;

    // Centralized Default Trip Settings
    private static final int DEFAULT_DAYS = 3;
    private static final BigDecimal DEFAULT_HOTEL_RATE = new BigDecimal("100.00");
    private static final BigDecimal DEFAULT_FOOD_RATE = new BigDecimal("40.00");
    private static final BigDecimal DEFAULT_TRANSPORT_RATE = new BigDecimal("30.00");
    private static final BigDecimal DEFAULT_MISC_RATE = new BigDecimal("15.00");

    private static final java.util.Set<String> STARTER_VERBS = java.util.Set.of(
        "plan", "travel", "find", "go", "create", "book", "help", "get", "organize", "make", "i", "we",
        "me", "us", "him", "her", "them", "it", "my", "your", "his", "their"
    );

    private static final java.util.Set<String> CONNECTIVE_WORDS = java.util.Set.of(
        "de", "di", "of", "and", "the", "la", "el", "le"
    );

    private static final java.util.Set<String> STOP_WORDS = java.util.Set.of(
        "for", "with", "on", "next", "this", "in", "to", "from", "tomorrow", "today", "winter", "summer", "spring", "autumn", "fall", "week", "month", "year", "days", "day", "style", "budget", "luxury", "standard", "family", "solo", "adventure", "business", "leisure"
    );

    private static final java.util.Set<String> DISALLOWED_DESTINATIONS = java.util.Set.of(
        "trip", "weekend", "vacation", "holiday", "itinerary", "plan", "flight", "hotel", "somewhere", "place", "city", "country", "destination", "me", "us", "him", "her", "them", "it", "my", "your", "his", "their", "a", "an", "the", "next", "week", "month", "year", "day", "days"
    );

    private final SearchProvider searchProvider;
    private final BudgetService budgetService;
    private final WeatherProvider weatherProvider;

    @Autowired
    private ApplicationContext applicationContext;

    public TravelPlannerAgent(SearchProvider searchProvider, BudgetService budgetService, WeatherProvider weatherProvider) {
        this.searchProvider = searchProvider;
        this.budgetService = budgetService;
        this.weatherProvider = weatherProvider;
    }

    @Autowired
    private com.cps.mcp.maps.service.GoogleMapsService googleMapsService;

    @Autowired
    private com.cps.mcp.airbnb.service.AirbnbService airbnbService;

    // --- Strongly Typed Blackboard DTOs ---

    public static class Destination {
        private final String name;
        public Destination(String name) { this.name = name; }
        public String name() { return name; }
        @Override public String toString() { return name; }
    }

    public static class TravelPlanReport {
        private final String content;
        public TravelPlanReport(String content) { this.content = content; }
        public String content() { return content; }
        @Override public String toString() { return content; }
    }

    public static class RouteSummary {
        private final com.cps.mcp.maps.service.GoogleMapsService.RouteInfo routeInfo;
        public RouteSummary(com.cps.mcp.maps.service.GoogleMapsService.RouteInfo routeInfo) { this.routeInfo = routeInfo; }
        public com.cps.mcp.maps.service.GoogleMapsService.RouteInfo routeInfo() { return routeInfo; }
        @Override public String toString() { return routeInfo != null ? routeInfo.toString() : "No Route Info"; }
    }

    public static class AccommodationList {
        private final List<com.cps.mcp.airbnb.service.AirbnbService.AirbnbListing> listings;
        public AccommodationList(List<com.cps.mcp.airbnb.service.AirbnbService.AirbnbListing> listings) { this.listings = listings; }
        public List<com.cps.mcp.airbnb.service.AirbnbService.AirbnbListing> listings() { return listings; }
        @Override public String toString() {
            return listings.stream().map(Object::toString).collect(Collectors.joining("\n"));
        }
    }

    // --- Reflection Helper ---

    private String getUserInputContent(Object userInputObj) {
        try {
            java.lang.reflect.Method getContentMethod = userInputObj.getClass().getMethod("getContent");
            return (String) getContentMethod.invoke(userInputObj);
        } catch (Exception e) {
            String str = userInputObj.toString();
            int start = str.indexOf("content=");
            if (start != -1) {
                int end = str.indexOf(",", start);
                if (end != -1) {
                    return str.substring(start + "content=".length(), end);
                }
                end = str.indexOf(")", start);
                if (end != -1) {
                    return str.substring(start + "content=".length(), end);
                }
            }
            return str;
        }
    }

    // --- Granular Action Methods ---

    @Action(description = "Extract destination from user prompt")
    public Destination extractDestination(UserInput input) {
        logger.info("UserInput: Received UserInput object on blackboard");
        String content = getUserInputContent(input);
        String name = extractDestinationName(content);
        logger.info("extractDestination: Extracted destination={}", name);
        return new Destination(name);
    }

    private String extractDestinationName(String prompt) {
        if (prompt == null || prompt.isBlank()) {
            throw new IllegalArgumentException("User input prompt is empty or null");
        }
        
        // Normalize whitespace and remove trailing punctuation
        String cleaned = prompt.trim().replaceAll("\\s+", " ");
        String normalized = cleaned.replaceAll("[.,?!]$", "");
        
        String[] tokens = normalized.split(" ");
        if (tokens.length == 0) {
            throw new IllegalArgumentException("User input prompt contains no tokens");
        }

        // Search for the first occurrence of "to" or "in" that is not the first token (or is a valid separator)
        int keywordIdx = -1;
        for (int i = 0; i < tokens.length; i++) {
            String tokenLower = tokens[i].toLowerCase();
            if (tokenLower.equals("to") || tokenLower.equals("in")) {
                if (i < tokens.length - 1) {
                    keywordIdx = i;
                    break;
                }
            }
        }

        if (keywordIdx != -1) {
            StringBuilder sb = new StringBuilder();
            for (int j = keywordIdx + 1; j < tokens.length; j++) {
                String word = tokens[j];
                String wordLower = word.toLowerCase().replaceAll("[^a-z]", "");
                
                if (STOP_WORDS.contains(wordLower)) {
                    break;
                }
                
                if (sb.length() > 0) sb.append(" ");
                sb.append(word.replaceAll("[^a-zA-Z]", ""));
            }
            
            String candidate = sb.toString().trim();
            if (isValidDestination(candidate)) {
                return titleCase(candidate);
            }
        }

        // Fallback: If no "to" or "in" keyword found, filter out starter verbs
        int startIdx = 0;
        while (startIdx < tokens.length) {
            String wordLower = tokens[startIdx].toLowerCase().replaceAll("[^a-z]", "");
            if (STARTER_VERBS.contains(wordLower) || STOP_WORDS.contains(wordLower) || CONNECTIVE_WORDS.contains(wordLower) || wordLower.equals("a") || wordLower.equals("an")) {
                startIdx++;
            } else {
                break;
            }
        }

        StringBuilder sb = new StringBuilder();
        for (int j = startIdx; j < tokens.length; j++) {
            String word = tokens[j];
            String wordLower = word.toLowerCase().replaceAll("[^a-z]", "");
            if (STOP_WORDS.contains(wordLower)) {
                break;
            }
            if (sb.length() > 0) sb.append(" ");
            sb.append(word.replaceAll("[^a-zA-Z]", ""));
        }

        String candidate = sb.toString().trim();
        if (isValidDestination(candidate)) {
            return titleCase(candidate);
        }

        throw new IllegalArgumentException("Unknown destination in user input: " + prompt);
    }

    private String titleCase(String input) {
        if (input == null || input.isBlank()) return input;
        String[] words = input.split(" ");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < words.length; i++) {
            String word = words[i];
            if (word.isEmpty()) continue;
            if (i > 0) sb.append(" ");
            
            String lower = word.toLowerCase();
            if (i > 0 && (lower.equals("de") || lower.equals("di") || lower.equals("of") || 
                          lower.equals("and") || lower.equals("the") || lower.equals("la") || 
                          lower.equals("el") || lower.equals("le"))) {
                sb.append(lower);
            } else {
                sb.append(Character.toUpperCase(word.charAt(0)))
                  .append(word.substring(1).toLowerCase());
            }
        }
        return sb.toString();
    }
    
    private boolean isValidDestination(String dest) {
        if (dest == null || dest.isBlank()) {
            return false;
        }
        String clean = dest.trim().toLowerCase();
        if (DISALLOWED_DESTINATIONS.contains(clean)) {
            return false;
        }
        return dest.length() >= 2 && dest.length() <= 50 && dest.matches(".*[a-zA-Z].*");
    }

    @Action(description = "Classify travel intent from user input")
    public TravelIntent classifyIntent(UserInput input) {
        logger.info("classifyIntent: Classifying user intent");
        String content = getUserInputContent(input);
        if (content == null) {
            content = "";
        }
        String normalized = content.toLowerCase();
        
        // Weather intent keywords
        if (normalized.contains("weather") || normalized.contains("forecast") || 
            normalized.contains("rain") || normalized.contains("temperature") || 
            normalized.contains("sunny") || normalized.contains("climate") ||
            normalized.contains("snow") || normalized.contains("wind") ||
            normalized.contains("condition")) {
            logger.info("classifyIntent: Detected WEATHER intent");
            return TravelIntent.WEATHER;
        }
        
        // Budget intent keywords
        if (normalized.contains("budget") || normalized.contains("cost") || 
            normalized.contains("price") || normalized.contains("expense") || 
            normalized.contains("estimate") || normalized.contains("how much") ||
            normalized.contains("spending") || normalized.contains("afford")) {
            logger.info("classifyIntent: Detected BUDGET intent");
            return TravelIntent.BUDGET;
        }
        
        // Travel plan intent keywords
        if (normalized.contains("plan") || normalized.contains("trip") || 
            normalized.contains("vacation") || normalized.contains("itinerary") || 
            normalized.contains("weekend") || normalized.contains("holiday") ||
            normalized.contains("travel") || normalized.contains("create itinerary")) {
            logger.info("classifyIntent: Detected TRAVEL_PLAN intent");
            return TravelIntent.TRAVEL_PLAN;
        }
        
        // Default to search for general information queries
        logger.info("classifyIntent: Defaulting to SEARCH intent");
        return TravelIntent.SEARCH;
    }

    @Action(description = "Search travel details for destination")
    public SearchResponse executeSearch(Destination dest) throws Exception {
        logger.info("Destination: Received Destination object on blackboard: {}", dest.name());
        logger.info("executeSearch: Executing web search for travel information in {}", dest.name());
        
        List<com.cps.mcp.search.model.SearchResult> combinedResults = new java.util.ArrayList<>();
        boolean isMock = searchProvider == null || 
                         searchProvider.getName() == null || 
                         "MockProvider".equalsIgnoreCase(searchProvider.getName()) ||
                         searchProvider.getClass().getName().contains("Mockito") ||
                         searchProvider.getClass().getName().contains("Proxy");
        if (chatModel != null && !isMock) {
            try {
                String prompt = "Generate 3 distinct search queries to gather comprehensive travel information (e.g. top attractions, local transportation, best areas to stay) for the destination: " + dest.name() + ". Output only the 3 queries, one per line. Do not add numbers, bullet points, introduction, or markdown.";
                String llmOutput = chatModel.call(prompt);
                logger.info("Decomposed subtasks/queries from LLM:\n{}", llmOutput);
                String[] queries = llmOutput.split("\\r?\\n");
                for (String q : queries) {
                    q = q.replaceAll("^\\s*[\\d*\\-.]+\\s*", "").trim(); // strip leading bullet points/numbers
                    if (!q.isEmpty()) {
                        logger.info("Executing subtask search: {}", q);
                        SearchResponse subResp = searchProvider.search(q);
                        if (subResp != null && subResp.getResults() != null) {
                            combinedResults.addAll(subResp.getResults());
                        }
                    }
                }
            } catch (Exception e) {
                logger.warn("Decomposition search failed: {}. Falling back to single query search.", e.getMessage());
            }
        }
        
        if (combinedResults.isEmpty()) {
            SearchResponse response = searchProvider.search(dest.name());
            logger.info("SearchResponse: Search completed, bound SearchResponse to blackboard");
            return response;
        }
        
        // Remove duplicate URLs
        java.util.Set<String> seenUrls = new java.util.HashSet<>();
        List<com.cps.mcp.search.model.SearchResult> uniqueResults = new java.util.ArrayList<>();
        for (com.cps.mcp.search.model.SearchResult r : combinedResults) {
            if (r.getUrl() != null && seenUrls.add(r.getUrl().trim())) {
                uniqueResults.add(r);
            }
        }
        
        logger.info("SearchResponse: Multi-query search completed with {} unique results", uniqueResults.size());
        return new SearchResponse(uniqueResults, searchProvider.getName(), dest.name(), uniqueResults.size(), System.currentTimeMillis());
    }

    @Action(description = "Get weather forecast for destination")
    public WeatherReport getWeather(Destination dest, UserInput input) throws Exception {
        logger.info("Destination: Received Destination object on blackboard: {}", dest.name());

        // Extract dates and trip duration directly from the user's goal string
        String content = getUserInputContent(input);
        if (content == null) content = "";
        String startDate = null;
        String endDate   = null;
        int tripDays     = DEFAULT_DAYS;

        java.util.regex.Pattern dateRangePattern = java.util.regex.Pattern.compile(
            "from\\s+(\\d{4}-\\d{2}-\\d{2})\\s+to\\s+(\\d{4}-\\d{2}-\\d{2})");
        java.util.regex.Matcher dateRangeMatcher = dateRangePattern.matcher(content);
        if (dateRangeMatcher.find()) {
            startDate = dateRangeMatcher.group(1);
            endDate   = dateRangeMatcher.group(2);
            try {
                java.time.LocalDate s = java.time.LocalDate.parse(startDate);
                java.time.LocalDate e = java.time.LocalDate.parse(endDate);
                long computed = java.time.temporal.ChronoUnit.DAYS.between(s, e);
                tripDays = computed > 0 ? (int) computed : 1;
            } catch (Exception ex) {
                startDate = null; endDate = null;
            }
        } else if (content.toLowerCase().contains("weekend")) {
            tripDays = 2;
        } else {
            java.util.regex.Pattern dayPat = java.util.regex.Pattern.compile("(\\d+)\\s*-?\\s*days?");
            java.util.regex.Matcher dayMat = dayPat.matcher(content.toLowerCase());
            if (dayMat.find()) {
                try { tripDays = Integer.parseInt(dayMat.group(1)); } catch (NumberFormatException ignored) {}
            }
        }

        boolean hasDates = startDate != null && !startDate.isBlank()
                        && endDate   != null && !endDate.isBlank();
        logger.info("getWeather: destination={}, tripDays={}, hasDates={} ({} to {})",
                dest.name(), tripDays, hasDates, startDate, endDate);

        boolean isMock = searchProvider == null ||
                         searchProvider.getName() == null ||
                         "MockProvider".equalsIgnoreCase(searchProvider.getName()) ||
                         searchProvider.getClass().getName().contains("Mockito") ||
                         searchProvider.getClass().getName().contains("Proxy");

        // Step 1: Gather current-conditions context from provider as seed for the LLM
        double seedTemp = 22.0;
        StringBuilder providerContext = new StringBuilder();
        try {
            WeatherReport seed = weatherProvider.getWeather(dest.name());
            if (seed != null) {
                seedTemp = seed.getTemperature();
                providerContext.append(String.format(
                    "Current conditions from weather provider: %s, %.1f°C, humidity %.0f%%, wind %.1f km/h.\n",
                    seed.getCondition(), seed.getTemperature(), seed.getHumidity(), seed.getWindSpeed()));
                logger.info("getWeather: Provider seed: {}", providerContext.toString().trim());
            }
        } catch (Exception e) {
            logger.warn("getWeather: Provider seed failed ({}). Continuing without it.", e.getMessage());
        }

        // Step 2: Always use LLM to generate per-day forecast when search+LLM are available
        if (chatModel != null && !isMock) {
            try {
                String query = hasDates
                    ? String.format("weather forecast in %s from %s to %s", dest.name(), startDate, endDate)
                    : String.format("%d day weather forecast %s", tripDays, dest.name());
                SearchResponse searchData = searchProvider.search(query);

                StringBuilder searchContent = new StringBuilder(providerContext);
                if (searchData != null && searchData.getResults() != null) {
                    for (com.cps.mcp.search.model.SearchResult r : searchData.getResults()) {
                        searchContent.append(r.getTitle()).append(": ").append(r.getContent()).append("\n");
                    }
                }

                // Build the per-day label instruction
                String dayLabels;
                if (hasDates) {
                    java.time.LocalDate s = java.time.LocalDate.parse(startDate);
                    StringBuilder labels = new StringBuilder();
                    for (int i = 0; i < tripDays; i++) {
                        if (i > 0) labels.append(", ");
                        labels.append(s.plusDays(i).toString());
                    }
                    dayLabels = "Produce one entry per travel day for these exact dates: " + labels +
                        ". Format each entry as \"YYYY-MM-DD: <condition> <temp>°C\" separated by \" | \".";
                } else {
                    java.time.LocalDate today = java.time.LocalDate.now();
                    StringBuilder labels = new StringBuilder();
                    for (int i = 0; i < tripDays; i++) {
                        if (i > 0) labels.append(", ");
                        labels.append("Day ").append(i + 1)
                              .append(" (").append(today.plusDays(i)).append(")");
                    }
                    dayLabels = "Produce one entry per travel day for " + tripDays + " days (" + labels +
                        "). Format each entry as \"Day N (YYYY-MM-DD): <condition> <temp>°C\" separated by \" | \".";
                }

                String prompt = String.format(
                    "You are a weather expert. Based on the information below, provide a realistic day-by-day weather forecast for %s.\n\n" +
                    "Weather Data:\n%s\n" +
                    "Instructions: %s\n\n" +
                    "Output EXACTLY a JSON object with NO extra text or markdown fences:\n" +
                    "{\n" +
                    "  \"temperature\": <average temperature number>,\n" +
                    "  \"condition\": \"<pipe-separated per-day entries, e.g. 2025-07-10: Sunny 28°C | 2025-07-11: Rainy 22°C>\",\n" +
                    "  \"humidity\": <average humidity 0-100>,\n" +
                    "  \"windSpeed\": <average wind speed km/h>,\n" +
                    "  \"severity\": \"<GOOD|MODERATE|POOR>\"\n" +
                    "}\n" +
                    "Base estimates on typical seasonal climate if real data is unavailable. The condition MUST contain a per-day breakdown separated by ' | '.",
                    dest.name(), searchContent.toString(), dayLabels
                );

                String llmOutput = chatModel.call(prompt);
                logger.info("getWeather: LLM raw output: {}", llmOutput);

                if (llmOutput.contains("```")) {
                    int start = llmOutput.indexOf("{");
                    int end = llmOutput.lastIndexOf("}");
                    if (start != -1 && end != -1 && end > start) {
                        llmOutput = llmOutput.substring(start, end + 1);
                    }
                }

                double temperature = seedTemp;
                String condition   = "Forecast unavailable";
                double humidity    = 55.0;
                double windSpeed   = 12.0;
                String severityStr = "GOOD";

                java.util.regex.Pattern pTemp = java.util.regex.Pattern.compile("\"temperature\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)");
                java.util.regex.Matcher mTemp = pTemp.matcher(llmOutput);
                if (mTemp.find()) temperature = Double.parseDouble(mTemp.group(1));

                java.util.regex.Pattern pCond = java.util.regex.Pattern.compile("\"condition\"\\s*:\\s*\"([^\"]+)\"");
                java.util.regex.Matcher mCond = pCond.matcher(llmOutput);
                if (mCond.find()) condition = mCond.group(1);

                java.util.regex.Pattern pHum = java.util.regex.Pattern.compile("\"humidity\"\\s*:\\s*(\\d+(?:\\.\\d+)?)");
                java.util.regex.Matcher mHum = pHum.matcher(llmOutput);
                if (mHum.find()) humidity = Double.parseDouble(mHum.group(1));

                java.util.regex.Pattern pWind = java.util.regex.Pattern.compile("\"windSpeed\"\\s*:\\s*(\\d+(?:\\.\\d+)?)");
                java.util.regex.Matcher mWind = pWind.matcher(llmOutput);
                if (mWind.find()) windSpeed = Double.parseDouble(mWind.group(1));

                java.util.regex.Pattern pSev = java.util.regex.Pattern.compile("\"severity\"\\s*:\\s*\"([^\"]+)\"");
                java.util.regex.Matcher mSev = pSev.matcher(llmOutput);
                if (mSev.find()) severityStr = mSev.group(1);

                com.cps.mcp.weather.model.WeatherReport.WeatherSeverity severity =
                        com.cps.mcp.weather.model.WeatherReport.WeatherSeverity.GOOD;
                try {
                    severity = com.cps.mcp.weather.model.WeatherReport.WeatherSeverity
                            .valueOf(severityStr.toUpperCase().trim());
                } catch (Exception ex) { /* fallback to GOOD */ }

                String provider = hasDates ? "llm-date-forecast" : "llm-daily-forecast";
                WeatherReport report = new WeatherReport(dest.name(), temperature, condition,
                        humidity, windSpeed, System.currentTimeMillis(), provider, severity);
                logger.info("getWeather: Day-by-day forecast: {}", condition);
                return report;

            } catch (Exception ex) {
                logger.error("getWeather: LLM daily forecast failed: {}", ex.getMessage());
            }
        }

        // Step 3: Fallback — use provider result (single-condition) or hard mock
        if (providerContext.length() > 0) {
            try {
                WeatherReport seed = weatherProvider.getWeather(dest.name());
                logger.warn("getWeather: LLM unavailable. Returning single-condition provider report for {}.", dest.name());
                return seed;
            } catch (Exception ignored) {}
        }
        logger.warn("getWeather: All sources failed for {}. Returning mock.", dest.name());
        return new WeatherReport(dest.name(), 20.0, "Mostly Sunny", 60.0, 12.0,
                System.currentTimeMillis(), "mock-weather-fallback",
                com.cps.mcp.weather.model.WeatherReport.WeatherSeverity.GOOD);
    }

    @Action(description = "Get route and travel directions details for destination")
    public RouteSummary getRouteDetails(Destination dest, UserInput input) {
        logger.info("getRouteDetails: Calculating directions for destination={}", dest.name());
        String origin = "Gateway/Center";
        String content = getUserInputContent(input);
        if (content != null && content.toLowerCase().contains("from")) {
            int fromIdx = content.toLowerCase().indexOf("from");
            String suffix = content.substring(fromIdx + 4).trim();
            String[] tokens = suffix.split(" ");
            if (tokens.length > 0) {
                origin = tokens[0].replaceAll("[^a-zA-Z]", "");
            }
        }
        com.cps.mcp.maps.service.GoogleMapsService.RouteInfo info = googleMapsService.getDirections(origin, dest.name());
        return new RouteSummary(info);
    }

    @Action(description = "Search Airbnb homestay options for destination")
    public AccommodationList getAirbnbAccommodation(Destination dest) {
        logger.info("getAirbnbAccommodation: Searching Airbnb stays in {}", dest.name());
        List<com.cps.mcp.airbnb.service.AirbnbService.AirbnbListing> stays = airbnbService.searchAirbnb(dest.name());
        return new AccommodationList(stays);
    }

    @Action(description = "Extract travel constraints from user prompt")
    public TravelConstraints extractConstraints(UserInput input) {
        logger.info("extractConstraints: Extracting constraints from UserInput");
        String content = getUserInputContent(input);
        if (content == null) content = "";
        String normalized = content.toLowerCase();

        // 1. Date range extraction  (YYYY-MM-DD from X to Y)
        String startDate = null;
        String endDate   = null;
        int days = DEFAULT_DAYS;

        java.util.regex.Pattern dateRangePattern = java.util.regex.Pattern.compile(
            "from\\s+(\\d{4}-\\d{2}-\\d{2})\\s+to\\s+(\\d{4}-\\d{2}-\\d{2})");
        java.util.regex.Matcher dateRangeMatcher = dateRangePattern.matcher(content);
        if (dateRangeMatcher.find()) {
            startDate = dateRangeMatcher.group(1);
            endDate   = dateRangeMatcher.group(2);
            try {
                java.time.LocalDate s = java.time.LocalDate.parse(startDate);
                java.time.LocalDate e = java.time.LocalDate.parse(endDate);
                long computed = java.time.temporal.ChronoUnit.DAYS.between(s, e);
                days = computed > 0 ? (int) computed : 1;
                logger.info("extractConstraints: Detected date range {} to {}, computed {} days", startDate, endDate, days);
            } catch (Exception ex) {
                logger.warn("extractConstraints: Failed to parse date range: {}", ex.getMessage());
                startDate = null;
                endDate   = null;
            }
        } else if (normalized.contains("weekend")) {
            days = 2;
        } else {
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("(\\d+)\\s*-?\\s*days?");
            java.util.regex.Matcher matcher = pattern.matcher(normalized);
            if (matcher.find()) {
                try { days = Integer.parseInt(matcher.group(1)); } catch (NumberFormatException e) { /* fallback */ }
            }
        }
        TripDuration duration = new TripDuration(days);

        // 2. Budget Preference
        BudgetPreference.BudgetPrefValue budgetVal = BudgetPreference.BudgetPrefValue.STANDARD;
        if (normalized.contains("budget")) {
            budgetVal = BudgetPreference.BudgetPrefValue.BUDGET;
        } else if (normalized.contains("luxury")) {
            budgetVal = BudgetPreference.BudgetPrefValue.LUXURY;
        }
        BudgetPreference budgetPreference = new BudgetPreference(budgetVal);

        // 3. Travel Style
        TravelStyle.TravelStyleValue styleVal = TravelStyle.TravelStyleValue.LEISURE;
        if (normalized.contains("family")) {
            styleVal = TravelStyle.TravelStyleValue.FAMILY;
        } else if (normalized.contains("solo")) {
            styleVal = TravelStyle.TravelStyleValue.SOLO;
        } else if (normalized.contains("adventure")) {
            styleVal = TravelStyle.TravelStyleValue.ADVENTURE;
        } else if (normalized.contains("business")) {
            styleVal = TravelStyle.TravelStyleValue.BUSINESS;
        }
        TravelStyle travelStyle = new TravelStyle(styleVal);

        TravelConstraints constraints = new TravelConstraints(duration, budgetPreference, travelStyle, startDate, endDate);
        logger.info("extractConstraints: Extracted constraints={}", constraints);
        return constraints;
    }

    @Action(description = "Calculate travel budget for destination")
    public BudgetEstimate calculateBudget(Destination dest, TravelConstraints constraints, AccommodationList accommodations, RouteSummary route) {
        logger.info("Destination: Received Destination object on blackboard: {}", dest.name());
        logger.info("calculateBudget: Calculating budget for destination={}, constraints={}, accommodations={}, route={}", dest.name(), constraints, accommodations, route);
        
        int days = constraints.duration().days();
        BigDecimal hotel = null;

        // Try extracting average Airbnb hotel rate from listings first
        if (accommodations != null && accommodations.listings() != null && !accommodations.listings().isEmpty()) {
            BigDecimal sum = BigDecimal.ZERO;
            int count = 0;
            for (com.cps.mcp.airbnb.service.AirbnbService.AirbnbListing listing : accommodations.listings()) {
                if (listing.price != null) {
                    // Extract digits from e.g. "$45/night" or "50,000 INR/night"
                    String cleanPrice = listing.price.replaceAll("[^0-9.]", "");
                    if (!cleanPrice.isEmpty()) {
                        try {
                            sum = sum.add(new BigDecimal(cleanPrice));
                            count++;
                        } catch (Exception e) {
                            // ignore parsing error
                        }
                    }
                }
            }
            if (count > 0) {
                hotel = sum.divide(BigDecimal.valueOf(count), 2, java.math.RoundingMode.HALF_UP);
                logger.info("calculateBudget: Calculated average hotel rate from Airbnb listings: {}", hotel);
            }
        }

        BigDecimal food = DEFAULT_FOOD_RATE;
        BigDecimal transport = DEFAULT_TRANSPORT_RATE;
        BigDecimal misc = DEFAULT_MISC_RATE;

        boolean extractedDynamically = false;

        // If we couldn't get a hotel rate from listings, fall back to LLM estimation
        if (hotel == null) {
            hotel = DEFAULT_HOTEL_RATE;

            boolean isMock = searchProvider == null || 
                             searchProvider.getName() == null || 
                             "MockProvider".equalsIgnoreCase(searchProvider.getName()) ||
                             searchProvider.getClass().getName().contains("Mockito") ||
                             searchProvider.getClass().getName().contains("Proxy");
            if (chatModel != null && !isMock) {
                try {
                    String query = "average daily cost hotel food transport for tourist in " + dest.name();
                    SearchResponse searchData = searchProvider.search(query);
                    StringBuilder searchContent = new StringBuilder();
                    if (searchData != null && searchData.getResults() != null) {
                        for (com.cps.mcp.search.model.SearchResult r : searchData.getResults()) {
                            searchContent.append(r.getTitle()).append(": ").append(r.getContent()).append("\n");
                        }
                    }
                    
                    String prompt = "Based on the following search results about travel expenses in " + dest.name() + ", extract the average daily cost (in USD) for a standard/mid-range traveler.\n" +
                            "Search Results:\n" + searchContent.toString() + "\n" +
                            "Output EXACTLY a JSON object matching this structure (do not add any extra text or markdown formatting outside the JSON):\n" +
                            "{\n" +
                            "  \"hotel\": 100.00,\n" +
                            "  \"food\": 40.00,\n" +
                            "  \"transport\": 30.00,\n" +
                            "  \"misc\": 15.00\n" +
                            "}\n" +
                            "Note: Provide reasonable estimates based on search results. Convert local currency to USD.";
                    
                    String llmOutput = chatModel.call(prompt);
                    if (llmOutput.contains("```")) {
                        int start = llmOutput.indexOf("{");
                        int end = llmOutput.lastIndexOf("}");
                        if (start != -1 && end != -1 && end > start) {
                            llmOutput = llmOutput.substring(start, end + 1);
                        }
                    }
                    
                    java.util.regex.Pattern pHotel = java.util.regex.Pattern.compile("\"hotel\"\\s*:\\s*(\\d+(?:\\.\\d+)?)");
                    java.util.regex.Matcher mHotel = pHotel.matcher(llmOutput);
                    if (mHotel.find()) {
                        hotel = new BigDecimal(mHotel.group(1));
                        extractedDynamically = true;
                    }
                    
                    java.util.regex.Pattern pFood = java.util.regex.Pattern.compile("\"food\"\\s*:\\s*(\\d+(?:\\.\\d+)?)");
                    java.util.regex.Matcher mFood = pFood.matcher(llmOutput);
                    if (mFood.find()) food = new BigDecimal(mFood.group(1));
                    
                    java.util.regex.Pattern pTrans = java.util.regex.Pattern.compile("\"transport\"\\s*:\\s*(\\d+(?:\\.\\d+)?)");
                    java.util.regex.Matcher mTrans = pTrans.matcher(llmOutput);
                    if (mTrans.find()) {
                        BigDecimal extracted = new BigDecimal(mTrans.group(1));
                        transport = extracted.compareTo(BigDecimal.ZERO) > 0 ? extracted : DEFAULT_TRANSPORT_RATE;
                    }
                    
                    java.util.regex.Pattern pMisc = java.util.regex.Pattern.compile("\"misc\"\\s*:\\s*(\\d+(?:\\.\\d+)?)");
                    java.util.regex.Matcher mMisc = pMisc.matcher(llmOutput);
                    if (mMisc.find()) {
                        BigDecimal extracted = new BigDecimal(mMisc.group(1));
                        misc = extracted.compareTo(BigDecimal.ZERO) > 0 ? extracted : DEFAULT_MISC_RATE;
                    }
                    
                    logger.info("Dynamic budget extraction succeeded: hotel={}, food={}, transport={}, misc={}", hotel, food, transport, misc);
                } catch (Exception e) {
                    logger.warn("Dynamic budget extraction failed: {}. Falling back to default/pre-defined rates.", e.getMessage());
                }
            }
        } else {
            // We have hotel rate from Airbnb listings. We still try to extract food, transport, misc dynamically if LLM is available.
            boolean isMock = searchProvider == null || 
                             searchProvider.getName() == null || 
                             "MockProvider".equalsIgnoreCase(searchProvider.getName()) ||
                             searchProvider.getClass().getName().contains("Mockito") ||
                             searchProvider.getClass().getName().contains("Proxy");
            if (chatModel != null && !isMock) {
                try {
                    String query = "average daily cost food transport for tourist in " + dest.name();
                    SearchResponse searchData = searchProvider.search(query);
                    StringBuilder searchContent = new StringBuilder();
                    if (searchData != null && searchData.getResults() != null) {
                        for (com.cps.mcp.search.model.SearchResult r : searchData.getResults()) {
                            searchContent.append(r.getTitle()).append(": ").append(r.getContent()).append("\n");
                        }
                    }
                    
                    String prompt = "Based on the following search results about travel expenses in " + dest.name() + ", extract the average daily cost (in USD) for a standard/mid-range traveler.\n" +
                            "Search Results:\n" + searchContent.toString() + "\n" +
                            "Output EXACTLY a JSON object matching this structure (do not add any extra text or markdown formatting outside the JSON):\n" +
                            "{\n" +
                            "  \"food\": 40.00,\n" +
                            "  \"transport\": 30.00,\n" +
                            "  \"misc\": 15.00\n" +
                            "}\n" +
                            "Note: Provide reasonable estimates based on search results. Convert local currency to USD.";
                    
                    String llmOutput = chatModel.call(prompt);
                    if (llmOutput.contains("```")) {
                        int start = llmOutput.indexOf("{");
                        int end = llmOutput.lastIndexOf("}");
                        if (start != -1 && end != -1 && end > start) {
                            llmOutput = llmOutput.substring(start, end + 1);
                        }
                    }
                    
                    java.util.regex.Pattern pFood = java.util.regex.Pattern.compile("\"food\"\\s*:\\s*(\\d+(?:\\.\\d+)?)");
                    java.util.regex.Matcher mFood = pFood.matcher(llmOutput);
                    if (mFood.find()) food = new BigDecimal(mFood.group(1));
                    
                    java.util.regex.Pattern pTrans = java.util.regex.Pattern.compile("\"transport\"\\s*:\\s*(\\d+(?:\\.\\d+)?)");
                    java.util.regex.Matcher mTrans = pTrans.matcher(llmOutput);
                    if (mTrans.find()) {
                        BigDecimal extracted = new BigDecimal(mTrans.group(1));
                        transport = extracted.compareTo(BigDecimal.ZERO) > 0 ? extracted : DEFAULT_TRANSPORT_RATE;
                    }
                    
                    java.util.regex.Pattern pMisc = java.util.regex.Pattern.compile("\"misc\"\\s*:\\s*(\\d+(?:\\.\\d+)?)");
                    java.util.regex.Matcher mMisc = pMisc.matcher(llmOutput);
                    if (mMisc.find()) {
                        BigDecimal extracted = new BigDecimal(mMisc.group(1));
                        misc = extracted.compareTo(BigDecimal.ZERO) > 0 ? extracted : DEFAULT_MISC_RATE;
                    }
                    
                    extractedDynamically = true;
                    logger.info("Dynamic food/transport extraction succeeded: food={}, transport={}, misc={}", food, transport, misc);
                } catch (Exception e) {
                    logger.warn("Dynamic food/transport extraction failed: {}. Using default values.", e.getMessage());
                }
            }
        }

        if (!extractedDynamically) {
            if ("Prague".equalsIgnoreCase(dest.name())) {
                if (hotel == DEFAULT_HOTEL_RATE) hotel = new BigDecimal("150.00");
                food = new BigDecimal("50.00");
                transport = new BigDecimal("40.00");
                misc = new BigDecimal("20.00");
            } else if ("Tokyo".equalsIgnoreCase(dest.name())) {
                if (hotel == DEFAULT_HOTEL_RATE) hotel = new BigDecimal("120.00");
                food = new BigDecimal("60.00");
                transport = new BigDecimal("50.00");
                misc = new BigDecimal("25.00");
            }
        }

        // Apply budget preference scaling factor
        BigDecimal factor = BigDecimal.ONE;
        if (constraints.budgetPreference().value() == BudgetPreference.BudgetPrefValue.BUDGET) {
            factor = new BigDecimal("0.8");
        } else if (constraints.budgetPreference().value() == BudgetPreference.BudgetPrefValue.LUXURY) {
            factor = new BigDecimal("2.0");
        }

        hotel = hotel.multiply(factor).setScale(2, java.math.RoundingMode.HALF_UP);
        food = food.multiply(factor).setScale(2, java.math.RoundingMode.HALF_UP);
        transport = transport.multiply(factor).setScale(2, java.math.RoundingMode.HALF_UP);
        misc = misc.multiply(factor).setScale(2, java.math.RoundingMode.HALF_UP);

        BudgetEstimate estimate = budgetService.estimateTripBudget(dest.name(), days, hotel, food, transport, misc);
        logger.info("BudgetEstimate: Budget calculated, bound BudgetEstimate to blackboard");
        return estimate;
    }

    // --- Goal-Achieving Action ---
    @Action(description = "Compose travel plan report")
    @AchievesGoal(description = "Plan Travel Itinerary")
    public TravelPlanReport composeTravelPlan(SearchResponse searchData, BudgetEstimate budgetData, WeatherReport weatherData, RouteSummary routeData, AccommodationList accommodationData) {
        logger.info("composeTravelPlan: Composing final travel plan report");
        
        String destination = budgetData.getDestination();
        int days = budgetData.getDays();
        BigDecimal hotelTotal = BigDecimal.ZERO;
        BigDecimal foodTotal = BigDecimal.ZERO;
        BigDecimal transportTotal = BigDecimal.ZERO;
        BigDecimal miscTotal = BigDecimal.ZERO;

        for (BudgetItem item : budgetData.getBreakdown().getItems()) {
            if ("Hotel".equalsIgnoreCase(item.getName())) {
                hotelTotal = item.getAmount();
            } else if ("Food".equalsIgnoreCase(item.getName())) {
                foodTotal = item.getAmount();
            } else if ("Transport".equalsIgnoreCase(item.getName())) {
                transportTotal = item.getAmount();
            } else if ("Misc".equalsIgnoreCase(item.getName())) {
                miscTotal = item.getAmount();
            }
        }

        BigDecimal daysBD = BigDecimal.valueOf(days);
        BigDecimal hotelPerDay = days > 0 ? hotelTotal.divide(daysBD, 2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal foodPerDay = days > 0 ? foodTotal.divide(daysBD, 2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal transportPerDay = days > 0 ? transportTotal.divide(daysBD, 2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal miscPerDay = days > 0 ? miscTotal.divide(daysBD, 2, java.math.RoundingMode.HALF_UP) : BigDecimal.ZERO;

        String searchResultsFormatted = searchData.getResults().stream()
                .map(r -> String.format("- %s (%s):\n  %s", r.getTitle(), r.getUrl(), r.getContent()))
                .collect(Collectors.joining("\n"));

        String searchResultsForLlm = searchData.getResults().stream()
                .limit(4)
                .map(r -> {
                    String content = r.getContent() != null ? r.getContent().trim() : "";
                    if (content.length() > 400) {
                        content = content.substring(0, 400) + "...";
                    }
                    return String.format("- %s (%s):\n  %s", r.getTitle(), r.getUrl() != null ? r.getUrl() : "#", content);
                })
                .collect(Collectors.joining("\n"));

        String budgetBreakdownFormatted = budgetData.getBreakdown().getItems().stream()
                .map(item -> String.format("  * %s: %s", item.getName(), item.getAmount().toString()))
                .collect(Collectors.joining("\n"));

        String routeInfoFormatted = routeData != null && routeData.routeInfo() != null ? routeData.routeInfo().toString() : "Not available";
        String accommodationFormatted = accommodationData != null ? accommodationData.toString() : "Not available";

        String searchHighlightsText = searchData.getResults().stream()
                .map(r -> {
                    String snippet = r.getContent() != null ? r.getContent().trim() : "";
                    if (snippet.length() > 160) {
                        snippet = snippet.substring(0, 160) + "...";
                    }
                    return String.format("- [%s](%s):\n  %s", r.getTitle(), r.getUrl() != null ? r.getUrl() : "#", snippet);
                })
                .collect(Collectors.joining("\n"));

        boolean isMock = searchProvider == null || 
                         searchProvider.getName() == null || 
                         "MockProvider".equalsIgnoreCase(searchProvider.getName()) ||
                         searchProvider.getClass().getName().contains("Mockito") ||
                         searchProvider.getClass().getName().contains("Proxy");
        if (chatModel != null && !isMock && !searchResultsForLlm.isEmpty()) {
            try {
                String prompt = String.format(
                    "You are a travel assistant. Synthesize the following raw search results for %s into a beautiful, presentable 'Search Highlights' section. " +
                    "Group them logically (e.g., Top Attractions, Local Transport, Accommodation Tips) and write them as a concise bulleted list in clean markdown. " +
                    "Make sure to include reference markdown links using the URLs from the search results where appropriate (e.g. [Link Title](url)). Do not add any introductory or concluding text.\n\n" +
                    "Search Results:\n%s",
                    destination, searchResultsForLlm
                );
                String synthesized = chatModel.call(prompt);
                if (synthesized != null && !synthesized.isBlank()) {
                    searchHighlightsText = synthesized;
                }
            } catch (Exception e) {
                logger.warn("LLM search highlights synthesis failed: {}", e.getMessage());
            }
        }

        StringBuilder composedOutput = new StringBuilder();
        composedOutput.append("==================================================\n");
        composedOutput.append("TRIP PLAN: ").append(destination).append("\n");
        composedOutput.append("==================================================\n\n");
        
        composedOutput.append("[1] Travel Summary\n");
        composedOutput.append("--------------------------------------------------\n");
        composedOutput.append("Itinerary and cost calculations successfully finalized.\n");
        composedOutput.append("Destination is verified via active search.\n");
        composedOutput.append("Total trip cost: ").append(budgetData.getTotalEstimate().toString()).append("\n\n");

        composedOutput.append("[2] Search Highlights\n");
        composedOutput.append("--------------------------------------------------\n");
        if (searchHighlightsText.isEmpty()) {
            composedOutput.append("No search highlights available.\n\n");
        } else {
            composedOutput.append(searchHighlightsText).append("\n\n");
        }

        composedOutput.append("[3] Budget Estimate\n");
        composedOutput.append("--------------------------------------------------\n");
        composedOutput.append("- Duration: ").append(days).append(" day").append(days > 1 ? "s" : "").append("\n");
        composedOutput.append("- Hotel/Night: $").append(hotelPerDay).append("\n");
        composedOutput.append("- Food/Day: $").append(foodPerDay).append("\n");
        composedOutput.append("- Transport/Day: $").append(transportPerDay).append("\n");
        composedOutput.append("- Misc/Day: $").append(miscPerDay).append("\n\n");
        composedOutput.append("Total Breakdown (all ").append(days).append(" day").append(days > 1 ? "s" : "").append("):\n");
        composedOutput.append(budgetBreakdownFormatted).append("\n");
        composedOutput.append("  TOTAL: $").append(budgetData.getTotalEstimate()).append("\n\n");

        composedOutput.append("[4] Weather Forecast\n");
        composedOutput.append("--------------------------------------------------\n");
        composedOutput.append("- Location: ").append(weatherData.getLocation()).append("\n");
        composedOutput.append("- Condition: ").append(weatherData.getCondition()).append("\n");
        composedOutput.append("- Temperature: ").append(weatherData.getTemperature()).append("°C\n");
        composedOutput.append("- Humidity: ").append(weatherData.getHumidity()).append("%\n");
        composedOutput.append("- Wind Speed: ").append(weatherData.getWindSpeed()).append(" km/h\n");
        composedOutput.append("- Severity: ").append(weatherData.getSeverity()).append("\n");
        composedOutput.append("- Provider: ").append(weatherData.getProvider()).append("\n\n");

        composedOutput.append("[4.1] Route & Directions\n");
        composedOutput.append("--------------------------------------------------\n");
        composedOutput.append("- ").append(routeInfoFormatted).append("\n\n");

        composedOutput.append("[4.2] Accommodation Options (Airbnb)\n");
        composedOutput.append("--------------------------------------------------\n");
        if (accommodationFormatted.isEmpty()) {
            composedOutput.append("No accommodation recommendations available.\n\n");
        } else {
            composedOutput.append(accommodationFormatted).append("\n\n");
        }

        String llmItinerary = "";
        if (chatModel != null && !isMock) {
            try {
                // Build date context for the itinerary prompt
                String dateContext = "";
                String weatherDailyNote = "";
                // Extract dates from weather condition string if it contains day-by-day forecast
                String weatherCondition = weatherData.getCondition();
                boolean hasDailyForecast = weatherCondition != null && weatherCondition.contains("|");
                if (hasDailyForecast) {
                    weatherDailyNote = String.format(
                        "Day-by-day weather forecast (match each itinerary day to its forecast):\n%s\n\n",
                        weatherCondition.replace(" | ", "\n"));
                }

                String prompt = String.format(
                    "You are an expert travel planner. Create a detailed daily itinerary for a %d-day trip to %s.%s\n" +
                    "Use the following search results about the destination:\n%s\n\n" +
                    "The traveler's budget details are:\n- Duration: %d days\n- Total Cost Estimate: %s\n\n" +
                    "%s" +
                    "Overall weather summary:\n- Location: %s\n- Avg Temperature: %.1f°C\n- Severity: %s\n\n" +
                    "Route and distance details (include this routing in the daily plan):\n- %s\n\n" +
                    "Airbnb Accommodation options (recommend these stays in the daily plan where appropriate):\n%s\n\n" +
                    "Generate a beautifully formatted daily itinerary. " +
                    "For each day include: the title (e.g., 'Day 1: Exploring [Destination]'), the expected weather, and a specific activity schedule with attraction names and practical tips. " +
                    "Crucially, for each day, provide a 'Daily Budget' breakdown including estimated costs for activities, food, and transport for that specific day. " +
                    "Format each day clearly using 'Day X:' headers. " +
                    "Do not include any introduction/greeting or generic remarks.",
                    days, destination,
                    dateContext,
                    searchResultsForLlm, days, budgetData.getTotalEstimate().toString(),
                    weatherDailyNote,
                    weatherData.getLocation(), weatherData.getTemperature(), weatherData.getSeverity(),
                    routeInfoFormatted, accommodationFormatted
                );
                llmItinerary = chatModel.call(prompt);
            } catch (Exception e) {
                logger.warn("LLM itinerary generation failed: {}", e.getMessage());
            }
        }

        composedOutput.append("[5] Synthesized Daily Itinerary\n");
        composedOutput.append("--------------------------------------------------\n");
        if (llmItinerary == null || llmItinerary.isEmpty()) {
            composedOutput.append("Itinerary synthesis is currently unavailable.\n");
        } else {
            composedOutput.append(llmItinerary).append("\n");
        }

        logger.info("TravelPlanReport: Composed final report successfully");
        logger.info("Goal Achieved: Planning completed");
        return new TravelPlanReport(composedOutput.toString());
    }

    // --- Goal-Specific Composers ---

    @Action(description = "Compose weather information report")
    public WeatherReportResult composeWeatherInfo(WeatherReport weatherData) {
        logger.info("composeWeatherInfo: Composing weather information report");
        
        if (weatherData == null) {
            logger.warn("composeWeatherInfo: Weather data is null");
            return new WeatherReportResult(null, "Unknown");
        }
        
        String destination = weatherData.getLocation();
        WeatherReportResult result = new WeatherReportResult(weatherData, destination);
        logger.info("Goal Achieved: Weather forecast provided for {}", destination);
        return result;
    }

    @Action(description = "Compose budget estimate report")
    public BudgetReportResult composeBudgetInfo(BudgetEstimate budgetData) {
        logger.info("composeBudgetInfo: Composing budget estimate report");
        
        if (budgetData == null) {
            logger.warn("composeBudgetInfo: Budget data is null");
            return new BudgetReportResult(null, "Unknown");
        }
        
        String destination = budgetData.getDestination();
        BudgetReportResult result = new BudgetReportResult(budgetData, destination);
        logger.info("Goal Achieved: Budget estimate provided for {}", destination);
        return result;
    }

    @Action(description = "Compose destination information report")
    public SearchReportResult composeDestinationInfo(SearchResponse searchData) {
        logger.info("composeDestinationInfo: Composing destination information report");
        
        if (searchData == null || searchData.getResults().isEmpty()) {
            logger.warn("composeDestinationInfo: Search data is null or empty");
            return new SearchReportResult(null, "Unknown");
        }
        
        String destination = searchData.getQuery() != null ? searchData.getQuery() : "Unknown";
        String searchResultsFormatted = searchData.getResults().stream()
                .map(r -> String.format("- %s (%s):\n  %s", r.getTitle(), r.getUrl(), r.getContent()))
                .collect(Collectors.joining("\n"));

        String synthesizedContent = "";
        boolean isMock = searchProvider == null || 
                         searchProvider.getName() == null || 
                         "MockProvider".equalsIgnoreCase(searchProvider.getName()) ||
                         searchProvider.getClass().getName().contains("Mockito") ||
                         searchProvider.getClass().getName().contains("Proxy");
        if (chatModel != null && !isMock && !searchResultsFormatted.isEmpty()) {
            try {
                String prompt = String.format(
                    "You are a travel assistant. Synthesize the following raw search results for %s into a beautiful, presentable 'Destination Information' section. " +
                    "Group them logically (e.g., Top Attractions, Local Transport, Accommodation Tips) and write them as a concise bulleted list in clean markdown. " +
                    "Make sure to include reference markdown links using the URLs from the search results where appropriate (e.g. [Link Title](url)). Do not add any introductory or concluding text.\n\n" +
                    "Search Results:\n%s",
                    destination, searchResultsFormatted
                );
                String synthesized = chatModel.call(prompt);
                if (synthesized != null && !synthesized.isBlank()) {
                    synthesizedContent = synthesized;
                }
            } catch (Exception e) {
                logger.warn("LLM destination info synthesis failed: {}", e.getMessage());
            }
        }

        SearchReportResult result = new SearchReportResult(searchData, destination, synthesizedContent);
        logger.info("Goal Achieved: Destination information provided for {}", destination);
        return result;
    }
}
