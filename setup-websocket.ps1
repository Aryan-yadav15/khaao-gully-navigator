# WebSocket Setup - Install Dependencies

Write-Host "Installing WebSocket and Location Tracking Dependencies..." -ForegroundColor Green
Write-Host ""

# Core dependencies for WebSocket integration
$dependencies = @(
    "expo-location",                                    # Location tracking
    "@react-native-async-storage/async-storage",       # Secure storage
    "expo-battery",                                     # Battery level (optional)
    "expo-notifications",                               # Push notifications (optional)
    "react-native-dotenv"                              # Environment variables
)

Write-Host "Installing packages..." -ForegroundColor Yellow
npm install $dependencies

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Update your HomeScreen.js to use WebSocket (see HomeScreen_WebSocket.js)" -ForegroundColor White
Write-Host "2. Configure your backend WebSocket endpoint" -ForegroundColor White
Write-Host "3. Test the connection by going 'Online' in the app" -ForegroundColor White
Write-Host ""
Write-Host "📖 See WEBSOCKET_INTEGRATION.md for complete guide" -ForegroundColor Cyan
