<###############################################################################################################################

Created by Jeremy Zuehsow, 10/15/2016

The purpose of this script is to get the installed version of Cisco AnyConnect VPN Client.

###############################################################################################################################>


."[PATH]]\Config\Common.ps1"
$version = '1.0'

Start_Script
Write_Banner

Import-Module ActiveDirectory
$searchBase = 'OU=Computers,OU=Tysons Corner,DC=IGEN,DC=LOCAL'
$logfile = ".\CiscoAnyConnectVersionLog.txt"

ForEach ($cpuName in (Get-ADComputer -Filter * -SearchBase $searchBase).Name)
{
    If (Test-Connection $cpuName -Count 1 -Quiet)
    {
        If ((Get-Service remoteregistry -ComputerName $cpuName).Status -ne 'Running')
        {
            Set-Service -Name remoteregistry -Computer $cpuName -StartupType Automatic
            Get-Service remoteregistry -ComputerName $cpuName | Set-Service -Status Running
        }
        
        $reg = [Microsoft.Win32.RegistryKey]::OpenRemoteBaseKey('LocalMachine', $cpuName)
        $regKey = $reg.OpenSubKey("SOFTWARE\\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\Cisco AnyConnect Secure Mobility Client")
        $version = $regKey.GetValue("DisplayVersion")
        Write-Host $cpuName $version <# | OutFile -Encoding Unicode -FilePath $logfile -Append#>
    }
    else
    {
        Write-Host "$cpuName Offline"
        #"$cpuName Offline" | Out-File -Encoding Unicode -FilePath $logfile -Append
    }
}