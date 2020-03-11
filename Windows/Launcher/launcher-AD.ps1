<#############################################################################################################################################################

Author: Jeremy Zuehsow
Purpose: Launch menu for Active Directory Scripts

Change Log:

#############################################################################################################################################################>


Set-Location $PSScriptRoot
.".\Config\Common.ps1"
$version = '1.0'

Start_Script


[CMDletBinding()]
Param
(
    [Parameter(Mandatory=$false)]
    [hashtable]$configData
    [bool]$connectToExchange
)

If ($connectToExchange)
{
    $remoteExchange = Get-ChildItem "$env:ProgramFiles\Microsoft\Exchange *" -Filter "RemoteExchange.ps1" -Recurse
    .$remoteExchange
    Connect-ExchangeServer -auto
}

$commonDir = '..\config\common.ps1'
cd $PSScriptRoot
.$commonDir
If ($configDate -eq $null)
{
    $configFQName = Get-ChildItem -Path ..\config\config.ini | Select-Object FullName
    $configData = @{}
    $configData = setConfigData $configFQName.FullName.ToString()
}

Function mainMenuAction ($result)
{
    switch ($result)
    {
        1 <#OU Stats Monitor#>
        {
            $dir = $PSScriptRoot
            cmd /c start PowerShell -Mta -NoExit -Command "Set-Location -Path '$dir'; & '.\Active Directory - Get OU Statistics\Get OU Statistics.ps1"
            & $PSCommandPath -configData $configData
        }
        2 <#Mandatory Reboot Monitor#>
        {
            $dir = $PSScriptRoot
            cmd /c start PowerShell -Mta -NoExit -Command "Set-Location -Path '$dir'; & '.\Active Directory - Reboot Workstations Automator\Reboot Computers Automator.ps1"
            & $PSCommandPath -configData $configData
        }
        3 <#Detailed Computer Information#>
        {
            & ".\Active Drectory - Detailed Computer Information\Detailed Computer Information.ps1" -configData $configData
        }
        4 <#Capture Computer Logon Servers#>
        {
            & ".\Active Drecotry - Capture Logon Servers\Capture Logon Servers.ps1" -configData $configData
        }
        5 <#Force GPUpdate on All Computers#>
        {
            & ".\Active Directory - Reboot and GPUpdate\Reboot and GPUpdate.ps1" -configData $configData
        }
        6 <#Exchange Server Tools#>
        {
            & ".\..\Launcher.ps1"
        }
        7 <#Exit#>
        {
            Exit
        }
    }
}