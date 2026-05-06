$json = '{"goal":"Plan a hackathon event"}'
Write-Host "JSON body: $json"
try {
  $result = Invoke-RestMethod -Uri 'http://localhost:8080/api/plans' -Method Post -Body $json -ContentType 'application/json'
  Write-Host "Success! Source: $($result.source)"
  Write-Host "Goal: $($result.goal)"
  Write-Host "Status: $($result.status)"
} catch {
  Write-Host "Error: $($_.Exception.Message)"
  Write-Host "Response: $($_.Exception.Response)"
}
