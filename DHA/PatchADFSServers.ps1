<#############################################################################################################################################################

Author:      Jeremy Zuehsow
Purpose:     This script monitors and reboots the ADFS servers for monthly patching.


Created:     07/01/2019

Change Log: v1.1 Added functions for monitoring servers and checking load balancers.
            v1.2 Modified monitoring function to manually check a certain number of times

#############################################################################################################################################################>


."\\fbinet\public\Software\Scripts\AD\PowerShell\Config\Common.ps1"
$version = '1.2'

Start_Script

$adfsTestURL = "[ADFS URL]"
$adfsF5Primary = "[LOAD BALANCER WEB CONSOLE 1]"
$adfsF5Secondary = "[Load BALANCER WEB CONSOLE 2]"
$svc = 'adfssrv'
$svcDisp = 'Active Directory Federation Services'
$header1 = '
-------------------------------------------------------------------------
PRIMARY ADFS SERVERS
-------------------------------------------------------------------------
'
$header2 = '
-------------------------------------------------------------------------
SECONDARY ADFS SERVERS
-------------------------------------------------------------------------
'
$serversPrimary = @(
'[ADFSSERVER1]',
'[ADFSSERVER2]',
'[ADFSSERVER3]',
'[ADFSSERVER4]'
)
$serversSecondary = @(
'[ADFSSERVER12]',
'[ADFSSERVER22]',
'[ADFSSERVER32]',
'[ADFSSERVER42]'
)
$serversCount = $serversPrimary.Count + $serversSecondary.Count
ForEach ($server in $serversPrimary)
{
	New-Variable ip$server –Value ((Test-Connection $server –Count 1).IPV4Address) -Force
	New-Variable status$server –Value $null -Force
}
ForEach ($server in $serversSecondary)
{
	New-Variable ip$server –Value ((Test-Connection $server –Count 1).IPV4Address) -Force
	New-Variable status$server –Value $null -Force
}


##############################################################################################################################################################
# Create Functions
##############################################################################################################################################################

Function Monitor_ADFS_Server
{
	[CmdletBinding()]
	Param()
	
	If (Test-Connection $server –Count 1 –Quiet)
	{
		$svrStatus = 'Online'; $svrStatusC = 'Green'
		$ip = (TestConnection $server –Count 1).IPV4Address.IPAddressToString
		If ($ip) {$ipC = 'Green'}
		Else {$ip = 'N/A'; $ipC = 'Red'}
		If ($server –like "*ADFS*")
		{
			$svcStatus = (Get-Service $svc-ComputerName $server).Status
			If ($svcStatus –eq 'Running') {$svcStatusC = 'Green'}
			Else {$svcStatusC = 'Red'}
		}
		Else {$svcStatus = 'N/A'; $svcStatusC = 'White'}
		
		Write-Host "$server..." -NoNewLine; Write-Host $svrStatus –F $svrStatusC -NoNewLine
		Write-Host "`t`tIPv4: " -NoNewLine; Write-Host $ip -F $ipC -NoNewline
		Write-Host "`t`t$svc..." -NoNewline; Write-Host $svcStatus -F $svcStatusC
	}
	Else {Write-Host "$server..." -NoNewLine; Write-Host "Offline" -F Red}
}

Function Monitor_ADFS
{
	Write_Banner
	$header1; ForEach ($server in $serversPrimary) {Monitor_ADFS_Server}
	$header2; ForEach ($server in $serversSecondary) {Monitor_ADFS_Server}
}

Function Check_LB
{
	While (!((Read-Host "Servers offline in Load Balancer (Y/N)") -eq 'Y'))
	{
		$ie = New-Object –ComObject internetexplorer.application
		Start-Sleep 1; Start-Process $adfsF5Primary
		Start-Sleep 1; Start-Process $adfsF5Secondary
		
		Write-Host "Go to F5 Load Balancer at primary/secondary sites and force servers to be patched offline.
		
		`t1. Login with admin RSA credentials
		
		`t2. Navigate to Local Traffic > network Map > Status dropdown = 'Available' > Show Map
		
		`t3. Click on the ADFS Pool
		
		`t4. 'Members' tab > Select Server(s) > Force Offline
		
		" -F Yellow
		Pause
	}
}


##############################################################################################################################################################
# Monitor and Reboot Servers
##############################################################################################################################################################

While ($true)
{
	Write-Host "`n`nType 'Q' to exit or 'C' to continue monitoring." -F Yellow
	$reboot = Read-Host "`n`nReboot (P)rimary / (S)econdary Servers"
	
	If ($reboot –like "Q*") {Stop_Script}
	ElseIf ($reboot –like "P*") {Check_LB; ForEach ($server in $serversPrimary) {Write-Host "`nRestarting $server..."; Restart-Computer $server –Force; Start-Sleep1}}
	ElseIf ($reboot –like "S*") {Check_LB; ForEach ($server in $serversSeconary) {Write-Host "`nRestarting $server..."; Restart-Computer $server –Force; Start-Sleep 1}}
	ElseIf ($reboot –like "C*")
	{
		Write-Host "`nMonitor for how many iterations? " -NoNewline; $count = Read-Host "Count"
		For ($i = 0; $i –le $count; $i++) {Monitor_ADFS}
		Continue
	}
	Else {Write-host "Invalid Selection. Please try again." -F Red; Continue}
	
	$ie = New-Object –ComObject internetexplorer.application
	$ie.visible = $true
	$ie.navigate($adfsTestURL)
	Write-Host "`n`nCheck Site Connection and Enable Servers in F5" -F Yellow
}