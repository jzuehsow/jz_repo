<#############################################################################################################################################################

Author: Jeremy Zuehsow
Purpose: Set System Defaults

Change Log:

#############################################################################################################################################################>

#Install the latest version of Powershell
$oldPSVersionMajor = $PSVersionTable.PSVersion.Major
$oldPSVersionMinor = $PSVersionTable.PSVersion.Minor
$oldPSVersion = "$oldPSVersionMajor"+"."+"$oldPSVersionMinor"
winget install --id Microsoft.Powershell --source winget

$newPSVersionMajor = $PSVersionTable.PSVersion.Major
$newPSVersionMinor = $PSVersionTable.PSVersion.Minor
$newPSVersion = "$newPSVersionMajor"+"."+"$newPSVersionMinor"
Write-Host "Powershell version upgraded from $oldPSVersion to $newPSVersion"


#Set Desktop Theme to Dark
start-process -filepath "C:\Windows\Resources\Themes\dark.theme"
timeout /t 3; taskkill /im "systemsettings.exe" /f


#Reboot Computer
$reboot = Read-Host "Press Enter to reboot or type 'quit' to exit without restarting"
if ($reboot -like q*) {exit}
else {Restart-Computer}
