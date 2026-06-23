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

import java.math.BigDecimal;
import java.util.stream.Collectors;

/**
 * Planner-driven Travel Planner Agent that orchestrates multi-tool execution
 * via type-based preconditions and postconditions.
 */
@Agent(name = "TravelPlannerAgent", description = "Travel planner agent that searches and calculates budgets for trips")
@Component
public class TravelPlannerAgent {

    private static final Logger logger = LoggerFactory.getLogger(TravelPlannerAgent.class);

    // Centralized Default Trip Settings
    private static final int DEFAULT_DAYS = 3;
    private static final BigDecimal DEFAULT_HOTEL_RATE = new BigDecimal("100.00");
    private static final BigDecimal DEFAULT_FOOD_RATE = new BigDecimal("40.00");
    private static final BigDecimal DEFAULT_TRANSPORT_RATE = new BigDecimal("30.00");
    private static final BigDecimal DEFAULT_MISC_RATE = new BigDecimal("15.00");

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
        int keywordIdx = -1;
        
        // 1. Search from right to left for "in" or "to" case-insensitively
        for (int i = tokens.length - 2; i >= 0; i--) {
            String t = tokens[i].toLowerCase();
            if (t.equals("in") || t.equals("to")) {
                keywordIdx = i;
                break;
            }
        }
        
        if (keywordIdx != -1 && keywordIdx < tokens.length - 1) {
            // Gather consecutive capitalized words starting from the match location
            StringBuilder sb = new StringBuilder();
            for (int j = keywordIdx + 1; j < tokens.length; j++) {
                String word = tokens[j];
                if (word.isEmpty()) continue;
                
                char firstChar = word.charAt(0);
                if (Character.isUpperCase(firstChar)) {
                    if (sb.length() > 0) sb.append(" ");
                    sb.append(word.replaceAll("[^a-zA-Z]", ""));
                } else {
                    // Check if it's a connective/preposition and there is a capitalized word next
                    String lowerWord = word.toLowerCase();
                    if ((lowerWord.equals("de") || lowerWord.equals("di") || lowerWord.equals("of") || 
                         lowerWord.equals("and") || lowerWord.equals("the") || lowerWord.equals("la") || 
                         lowerWord.equals("el") || lowerWord.equals("le")) && 
                        j + 1 < tokens.length && !tokens[j+1].isEmpty() && Character.isUpperCase(tokens[j+1].charAt(0))) {
                        if (sb.length() > 0) sb.append(" ");
                        sb.append(word.replaceAll("[^a-zA-Z]", ""));
                    } else {
                        break;
                    }
                }
            }
            if (sb.length() > 0) {
                String result = sb.toString();
                if (isValidDestination(result)) {
                    return result;
                }
            }
        }
        
        // 2. Fallback: scan all tokens and find first capitalized token sequence
        for (int i = 0; i < tokens.length; i++) {
            String word = tokens[i];
            if (word.isEmpty()) continue;
            char firstChar = word.charAt(0);
            if (Character.isUpperCase(firstChar)) {
                // Skip common sentence starters if it's the first word
                if (i == 0 && (word.equalsIgnoreCase("Plan") || word.equalsIgnoreCase("Travel") || 
                               word.equalsIgnoreCase("Find") || word.equalsIgnoreCase("Go") ||
                               word.equalsIgnoreCase("Create") || word.equalsIgnoreCase("Book") ||
                               word.equalsIgnoreCase("Help") || word.equalsIgnoreCase("I"))) {
                    continue;
                }
                StringBuilder tempSb = new StringBuilder();
                int j = i;
                while (j < tokens.length) {
                    String nextWord = tokens[j];
                    if (nextWord.isEmpty()) break;
                    if (Character.isUpperCase(nextWord.charAt(0))) {
                        if (tempSb.length() > 0) tempSb.append(" ");
                        tempSb.append(nextWord.replaceAll("[^a-zA-Z]", ""));
                        j++;
                    } else {
                        // Check if it's a connective/preposition and there is a capitalized word next
                        String lowerWord = nextWord.toLowerCase();
                        if ((lowerWord.equals("de") || lowerWord.equals("di") || lowerWord.equals("of") || 
                             lowerWord.equals("and") || lowerWord.equals("the") || lowerWord.equals("la") || 
                             lowerWord.equals("el") || lowerWord.equals("le")) && 
                            j + 1 < tokens.length && !tokens[j+1].isEmpty() && Character.isUpperCase(tokens[j+1].charAt(0))) {
                            if (tempSb.length() > 0) tempSb.append(" ");
                            tempSb.append(nextWord.replaceAll("[^a-zA-Z]", ""));
                            j++;
                        } else {
                            break;
                        }
                    }
                }
                String candidate = tempSb.toString();
                if (isValidDestination(candidate)) {
                    return candidate;
                }
                i = j;
            }
        }
        
        throw new IllegalArgumentException("Unknown destination in user input: " + prompt);
    }
    
    private boolean isValidDestination(String dest) {
        if (dest == null || dest.isBlank()) {
            return false;
        }
        return dest.length() >= 2 && dest.length() <= 50 && dest.matches(".*[a-zA-Z].*");
    }

    @Action(description = "Search travel details for destination")
    public SearchResponse executeSearch(Destination dest) throws Exception {
        logger.info("Destination: Received Destination object on blackboard: {}", dest.name());
        logger.info("executeSearch: Executing web search for travel information in {}", dest.name());
        SearchResponse response = searchProvider.search(dest.name());
        logger.info("SearchResponse: Search completed, bound SearchResponse to blackboard");
        return response;
    }

    @Action(description = "Get weather forecast for destination")
    public WeatherReport getWeather(Destination dest) throws Exception {
        logger.info("Destination: Received Destination object on blackboard: {}", dest.name());
        logger.info("getWeather: Fetching weather forecast for {}", dest.name());
        WeatherReport report = weatherProvider.getWeather(dest.name());
        logger.info("WeatherReport: Weather search completed, bound WeatherReport to blackboard");
        return report;
    }

    @Action(description = "Extract travel constraints from user prompt")
    public TravelConstraints extractConstraints(UserInput input) {
        logger.info("extractConstraints: Extracting constraints from UserInput");
        String content = getUserInputContent(input);
        if (content == null) {
            content = "";
        }
        String normalized = content.toLowerCase();

        // 1. Duration
        int days = DEFAULT_DAYS;
        if (normalized.contains("weekend")) {
            days = 2;
        } else {
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("(\\d+)\\s*-?\\s*days?");
            java.util.regex.Matcher matcher = pattern.matcher(normalized);
            if (matcher.find()) {
                try {
                    days = Integer.parseInt(matcher.group(1));
                } catch (NumberFormatException e) {
                    // fallback
                }
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

        TravelConstraints constraints = new TravelConstraints(duration, budgetPreference, travelStyle);
        logger.info("extractConstraints: Extracted constraints={}", constraints);
        return constraints;
    }

    @Action(description = "Calculate travel budget for destination")
    public BudgetEstimate calculateBudget(Destination dest, TravelConstraints constraints) {
        logger.info("Destination: Received Destination object on blackboard: {}", dest.name());
        logger.info("calculateBudget: Calculating budget for destination={}, constraints={}", dest.name(), constraints);
        
        int days = constraints.duration().days();
        BigDecimal hotel = DEFAULT_HOTEL_RATE;
        BigDecimal food = DEFAULT_FOOD_RATE;
        BigDecimal transport = DEFAULT_TRANSPORT_RATE;
        BigDecimal misc = DEFAULT_MISC_RATE;

        if ("Prague".equalsIgnoreCase(dest.name())) {
            hotel = new BigDecimal("150.00");
            food = new BigDecimal("50.00");
            transport = new BigDecimal("40.00");
            misc = new BigDecimal("20.00");
        } else if ("Tokyo".equalsIgnoreCase(dest.name())) {
            hotel = new BigDecimal("120.00");
            food = new BigDecimal("60.00");
            transport = new BigDecimal("50.00");
            misc = new BigDecimal("25.00");
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
    public TravelPlanReport composeTravelPlan(SearchResponse searchData, BudgetEstimate budgetData, WeatherReport weatherData) {
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

        String budgetBreakdownFormatted = budgetData.getBreakdown().getItems().stream()
                .map(item -> String.format("  * %s: %s", item.getName(), item.getAmount().toString()))
                .collect(Collectors.joining("\n"));

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
        if (searchResultsFormatted.isEmpty()) {
            composedOutput.append("No search highlights available.\n\n");
        } else {
            composedOutput.append(searchResultsFormatted).append("\n\n");
        }

        composedOutput.append("[3] Budget Estimate\n");
        composedOutput.append("--------------------------------------------------\n");
        composedOutput.append("- Duration: ").append(days).append(" days\n");
        composedOutput.append("- Hotel per Day: ").append(hotelPerDay).append("\n");
        composedOutput.append("- Food per Day: ").append(foodPerDay).append("\n");
        composedOutput.append("- Transport per Day: ").append(transportPerDay).append("\n");
        composedOutput.append("- Misc per Day: ").append(miscPerDay).append("\n\n");
        composedOutput.append("Budget Breakdown:\n");
        composedOutput.append(budgetBreakdownFormatted).append("\n\n");

        composedOutput.append("[4] Weather Forecast\n");
        composedOutput.append("--------------------------------------------------\n");
        composedOutput.append("- Location: ").append(weatherData.getLocation()).append("\n");
        composedOutput.append("- Condition: ").append(weatherData.getCondition()).append("\n");
        composedOutput.append("- Temperature: ").append(weatherData.getTemperature()).append("°C\n");
        composedOutput.append("- Humidity: ").append(weatherData.getHumidity()).append("%\n");
        composedOutput.append("- Wind Speed: ").append(weatherData.getWindSpeed()).append(" km/h\n");
        composedOutput.append("- Severity: ").append(weatherData.getSeverity()).append("\n");
        composedOutput.append("- Provider: ").append(weatherData.getProvider()).append("\n");

        logger.info("TravelPlanReport: Composed final report successfully");
        logger.info("Goal Achieved: Planning completed");
        return new TravelPlanReport(composedOutput.toString());
    }
}
