import { Box, Typography, Stack, Grid, Link, Divider, Chip } from "@mui/material";
import MapIcon from "@mui/icons-material/Map";
import HotelIcon from "@mui/icons-material/Hotel";
import SummaryIcon from "@mui/icons-material/Description";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import WbSunnyIcon from "@mui/icons-material/WbSunny";
import { GlassCard } from "@shared/ui/components/glass-card";
import { sanitizeText } from "@shared/lib/sanitize";

interface PlanSummaryProps {
  summary: string;
}

const stripMarkdown = (text: string) => text ? text.replace(/\*\*/g, '') : '';

export function PlanSummary({ summary }: PlanSummaryProps) {
  if (!summary) return null;

  // Extraction logic
  const googleMapsLinkMatch = summary.match(/\[View Route on Google Maps\]\((.*?)\)/);
  const googleMapsLink = googleMapsLinkMatch ? googleMapsLinkMatch[1] : null;

  const airbnbLinks: { name: string; link: string }[] = [];
  const airbnbRegex = /- \[(.*?)\]\((https:\/\/www\.airbnb\.com\/.*?)\)/g;
  let match;
  while ((match = airbnbRegex.exec(summary)) !== null) {
    airbnbLinks.push({ name: match[1], link: match[2] });
  }

  const budgetMatch = summary.match(/Total trip cost: ([\$\d\.,]+)/i) || summary.match(/TOTAL: ([\$\d\.,]+)/i);
  const totalBudget = budgetMatch ? budgetMatch[1] : null;

  const destinationMatch = summary.match(/TRIP PLAN: (.*)/i);
  const destination = destinationMatch ? stripMarkdown(destinationMatch[1]) : null;

  // Extract a brief overview (first paragraph after [1] Travel Summary)
  const summaryMatch = summary.match(/\[1\] Travel Summary\s*-+\s*([\s\S]*?)(?=\[\d\]|$)/);
  const fullOverview = summaryMatch ? summaryMatch[1].trim() : "";
  // Take first 3 lines or first 300 chars for a concise overview
  const overviewText = stripMarkdown(fullOverview.split('\n').slice(0, 3).join('\n').trim());

  // Extract Itinerary
  const itineraryMatch = summary.match(/\[5\] Synthesized Daily Itinerary\s*-+\s*([\s\S]*)/);
  const itineraryText = itineraryMatch ? itineraryMatch[1].trim() : "";

  const itineraryDays: { day: string; title: string; date?: string; weather?: string; activities: string; budget: string }[] = [];
  if (itineraryText) {
    const dayBlocks = itineraryText.split(/(?=Day \d+:)/).filter(b => b.trim().length > 0);
    dayBlocks.forEach(block => {
      const dayMatch = block.match(/Day (\d+): (.*)\n?([\s\S]*)/);
      if (dayMatch) {
        const dayNum = dayMatch[1];
        const title = stripMarkdown(dayMatch[2].trim());
        let content = dayMatch[3].trim();
        
        // Try to extract Daily Budget from content
        const budgetRegex = /(?:Daily Budget|Budget breakdown|Estimated Costs|Budget):?\s*([\s\S]*?)(?=\n\n|\nDay \d+:|$)/i;
        const budgetMatch = content.match(budgetRegex);
        let budget = "";
        if (budgetMatch) {
            budget = stripMarkdown(budgetMatch[1].trim());
            content = content.replace(budgetMatch[0], "").trim();
        }

        // Extract weather - looking for something like "**Partly Cloudy, 26°C**"
        const weatherMatch = content.match(/\*\*?([^*]*?(?:°C|°F|Cloudy|Sunny|Rain|Clear)[^*]*?)\*\*?/i);
        const weather = weatherMatch ? stripMarkdown(weatherMatch[1].trim()) : "";
        if (weatherMatch) {
            content = content.replace(weatherMatch[0], "").trim();
        }

        // Extract Date - looking for "**2026-07-02**"
        const dateMatch = content.match(/\*\*?(\d{4}-\d{2}-\d{2})\*\*?/);
        const date = dateMatch ? dateMatch[1] : "";
        if (dateMatch) {
             content = content.replace(dateMatch[0], "").trim();
        }
        
        itineraryDays.push({
          day: dayNum,
          title,
          date,
          weather,
          activities: stripMarkdown(content),
          budget
        });
      }
    });
  }

  return (
    <Box sx={{ opacity: 0, transform: "translateY(15px)", animation: "fadeInUp 0.75s cubic-bezier(0.16, 1, 0.3, 1) forwards", animationDelay: "0.1s" }}>
      <Typography
        variant="h6"
        fontWeight={700}
        sx={{ color: "#F8FAFC", mb: 2.5, letterSpacing: "-0.015em", fontSize: "1.1rem" }}
      >
        Plan Overview
      </Typography>

      <GlassCard sx={{ p: { xs: 3, md: 4 }, position: "relative", overflow: "hidden" }}>
        {/* Background Decorative Glow */}
        <Box
          sx={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            backgroundColor: "rgba(139, 92, 246, 0.08)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Stack spacing={3}>
              <Box>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                  <SummaryIcon sx={{ color: "#8B5CF6" }} />
                  <Typography variant="h6" fontWeight={600} color="#F1F5F9">
                    {destination ? `Trip to ${destination}` : "Travel Summary"}
                  </Typography>
                </Stack>
                <Typography variant="body1" sx={{ color: "#94A3B8", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {overviewText || "Your comprehensive travel plan has been generated with optimized routes and curated accommodations."}
                </Typography>
              </Box>

              <Divider sx={{ borderColor: "rgba(255, 255, 255, 0.06)" }} />

              <Stack direction={{ xs: "column", sm: "row" }} spacing={4}>
                {totalBudget && (
                  <Box>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", mb: 1 }}>
                      Estimated Budget
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AttachMoneyIcon sx={{ color: "#10B981", fontSize: "1.2rem" }} />
                      <Typography variant="h6" fontWeight={700} color="#F8FAFC">
                        {totalBudget}
                      </Typography>
                    </Stack>
                  </Box>
                )}

                {googleMapsLink && (
                  <Box>
                    <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", mb: 1 }}>
                      Navigation
                    </Typography>
                    <Link
                      href={googleMapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        color: "#3B82F6",
                        textDecoration: "none",
                        fontWeight: 600,
                        "&:hover": { color: "#60A5FA", textDecoration: "underline" }
                      }}
                    >
                      <MapIcon sx={{ fontSize: "1.2rem" }} />
                      View on Google Maps
                    </Link>
                  </Box>
                )}
              </Stack>
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ height: "100%", backgroundColor: "rgba(255, 255, 255, 0.02)", borderRadius: 3, p: 3, border: "1px solid rgba(255, 255, 255, 0.04)" }}>
              <Typography variant="subtitle2" sx={{ color: "#F8FAFC", fontWeight: 700, mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
                <HotelIcon sx={{ color: "#F59E0B", fontSize: "1.1rem" }} />
                Accommodation Stays
              </Typography>

              {airbnbLinks.length > 0 ? (
                <Stack spacing={2}>
                  {airbnbLinks.map((item, index) => (
                    <Link
                      key={index}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: "block",
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.05)",
                        color: "#E2E8F0",
                        textDecoration: "none",
                        transition: "all 0.2s",
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 0.06)",
                          borderColor: "rgba(239, 68, 68, 0.3)",
                          color: "#FFFFFF"
                        }
                      }}
                    >
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#FCA5A5" }}>
                        View on Airbnb
                      </Typography>
                    </Link>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: "#64748B", fontStyle: "italic" }}>
                  No specific accommodation links found in the plan.
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* Premium Day-by-Day Itinerary Section */}
        {itineraryDays.length > 0 && (
          <Box sx={{ mt: 5 }}>
            <Divider sx={{ mb: 4, borderColor: "rgba(255, 255, 255, 0.08)" }}>
              <Chip 
                label="TRAVEL ITINERARY" 
                size="small"
                sx={{ 
                  backgroundColor: "rgba(139, 92, 246, 0.1)", 
                  color: "#A78BFA", 
                  fontWeight: 700, 
                  fontSize: "0.65rem", 
                  letterSpacing: "0.15em",
                  border: "1px solid rgba(139, 92, 246, 0.2)"
                }} 
              />
            </Divider>

            <Stack spacing={4}>
              {itineraryDays.map((item, index) => (
                <Box key={index} sx={{ position: "relative" }}>
                  <Grid container spacing={3}>
                    <Grid item xs={12} sm={3} md={2}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: "14px",
                            backgroundColor: "rgba(139, 92, 246, 0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid rgba(139, 92, 246, 0.2)",
                            color: "#A78BFA",
                            flexShrink: 0
                          }}
                        >
                          <CalendarMonthIcon />
                        </Box>
                        <Box>
                          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, textTransform: "uppercase", display: "block" }}>
                            Day
                          </Typography>
                          <Typography variant="h5" fontWeight={800} color="#F8FAFC" sx={{ lineHeight: 1 }}>
                            {item.day}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>
                    <Grid item xs={12} sm={9} md={10}>
                      <Box sx={{ p: 3, borderRadius: 4, backgroundColor: "rgba(255, 255, 255, 0.015)", border: "1px solid rgba(255, 255, 255, 0.04)", transition: "all 0.3s", "&:hover": { backgroundColor: "rgba(255, 255, 255, 0.03)", borderColor: "rgba(139, 92, 246, 0.2)" } }}>
                        {item.date && (
                          <Typography variant="caption" sx={{ color: "#64748B", fontWeight: 700, mb: 0.5, display: "block", letterSpacing: "0.05em" }}>
                            {item.date}
                          </Typography>
                        )}
                        <Typography variant="h6" fontWeight={700} color="#F1F5F9" sx={{ mb: item.weather ? 1.5 : 2 }}>
                          {item.title}
                        </Typography>

                        {item.weather && (
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2.5, backgroundColor: "rgba(255, 255, 255, 0.03)", width: "fit-content", px: 1.5, py: 0.6, borderRadius: 1.5, border: "1px solid rgba(255, 255, 255, 0.05)" }}>
                            <WbSunnyIcon sx={{ color: "#F59E0B", fontSize: "1rem" }} />
                            <Typography variant="body2" fontWeight={600} color="#CBD5E1" sx={{ fontSize: "0.85rem" }}>
                              {item.weather}
                            </Typography>
                          </Stack>
                        )}
                        
                        <Box sx={{ mb: 2.5 }}>
                          {item.activities.split('\n').filter(l => l.trim().length > 0).map((line, idx) => {
                             const timeMatch = line.match(/^[- ]*?(\d{1,2}:\d{2}\s*(?:AM|PM)):/i);
                             if (timeMatch) {
                               const time = timeMatch[1];
                               const activity = line.replace(timeMatch[0], '').trim();
                               return (
                                 <Box key={idx} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', mb: 1.5 }}>
                                   <Chip 
                                     icon={<AccessTimeIcon sx={{ fontSize: '0.85rem !important' }} />}
                                     label={time} 
                                     size="small" 
                                     sx={{ 
                                       height: 24,
                                       backgroundColor: 'rgba(59, 130, 246, 0.12)', 
                                       color: '#60A5FA', 
                                       fontWeight: 700,
                                       borderRadius: '6px',
                                       border: '1px solid rgba(59, 130, 246, 0.2)',
                                       '& .MuiChip-label': { px: 1, fontSize: '0.75rem' }
                                     }} 
                                   />
                                   <Typography variant="body2" sx={{ color: "#E2E8F0", lineHeight: 1.6, pt: 0.2 }}>
                                     {activity}
                                   </Typography>
                                 </Box>
                               );
                             }
                             
                             if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
                               return (
                                 <Typography key={idx} variant="body2" sx={{ color: "#94A3B8", ml: 3.5, pl: 2, borderLeft: '2px solid rgba(255,255,255,0.05)', lineHeight: 1.6, mb: 1 }}>
                                   {line.trim().replace(/^[\*\-]\s*/, '')}
                                 </Typography>
                               );
                             }

                             return (
                               <Typography key={idx} variant="body2" sx={{ color: "#94A3B8", lineHeight: 1.6, mb: 1 }}>
                                 {line}
                               </Typography>
                             );
                          })}
                        </Box>

                        {item.budget && (
                          <Box sx={{ mt: 2, pt: 2, borderTop: "1px dashed rgba(255, 255, 255, 0.08)" }}>
                             <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                <AccountBalanceWalletIcon sx={{ color: "#10B981", fontSize: "1.1rem", mt: 0.3 }} />
                                <Box>
                                   <Typography variant="caption" sx={{ color: "#10B981", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                      Estimated Daily Budget
                                   </Typography>
                                   <Typography variant="body2" sx={{ color: "#E2E8F0", mt: 0.5, fontStyle: "italic" }}>
                                      {item.budget}
                                   </Typography>
                                </Box>
                             </Stack>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </Box>
              ))}
            </Stack>
          </Box>
        )}
      </GlassCard>

      <style>
        {`
          @keyframes fadeInUp {
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </Box>
  );
}
