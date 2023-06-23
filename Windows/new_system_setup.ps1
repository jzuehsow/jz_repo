<#############################################################################################################################################################

Author: Jeremy Zuehsow
Purpose: Set System Defaults on PC

Change Log:

#############################################################################################################################################################>


Function update_powershell
{
    $oldPSVersionMajor = $PSVersionTable.PSVersion.Major
    $oldPSVersionMinor = $PSVersionTable.PSVersion.Minor
    $oldPSVersion = "$oldPSVersionMajor"+"."+"$oldPSVersionMinor"
    winget install --id Microsoft.Powershell --source winget
    
    $newPSVersionMajor = $PSVersionTable.PSVersion.Major
    $newPSVersionMinor = $PSVersionTable.PSVersion.Minor
    $newPSVersion = "$newPSVersionMajor"+"."+"$newPSVersionMinor"
    Write-Host "Powershell version upgraded from $oldPSVersion to $newPSVersion"
}

Function set_desktop_heme
{
    start-process -filepath "C:\Windows\Resources\Themes\dark.theme"
    timeout /t 3; taskkill /im "systemsettings.exe" /f

    #CHANGE BACKGROUND FROM IMAGE IN ONEDRIVE????
}




#Reboot Computer
$reboot = Read-Host "Press Enter to reboot or type 'quit' to exit without restarting"
if ($reboot -like q*) {exit}
else {Restart-Computer}

#Bookmarks
#Power Settings (Sleep)
#Local Admin
#Local User
#Wifi Setup?
#Dock Apps
#Download/Install Apps - GitHub, VSCode, Chrome, Docker, Office
#OneDrive
#OneNote
#Office365
#Folder - Show extensions
#Date Time - 24hr, 
#AutoUpdate Setttings
#Windows Security Settings
#Windows Feature - Defender Application Guard
#Network connections to other machines (INVENTORY FILE???)

