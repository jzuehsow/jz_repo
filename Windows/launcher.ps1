<#############################################################################################################################################################

Author: Jeremy Zuehsow
Purpose: Launch menu for launcher scripts

Change Log:

#############################################################################################################################################################>


Remove-variable * -ErrorAction 'SilentlyContinue'
."..\Config\Common.ps1"
$version = '1.0'

Start_Script

$configFile = ".\config\config.ini"
$configFQName = Get-ChildItem -Path $configFile| Select-Object FullName
$configData = @()
$configData = setConfigData $configFQName.FullName.ToString()

Function MainMenuAction ($result)
{
    Switch ($result)
    {
        1 {& ".\ActiveDirectory\launcher-AD.ps1" -configData $configData -ConnectTo Exchange $false}
        #SPLIT AUDITING/MONITORING AND ACTIONS
        #SPLIT SPECIFIC AND BULK ACTIONS

        2 {& ".\Exchange\launcher-EXCH.ps1" -configData $configData -ConnectToExchange $true}
        3 {<#Options / Settings#>}
        4 {Exit}
        Default {}
    }
}

$result = 0
While ($result -eq 0)
{
    $title = "Server Administration Toolkit"
    $choices = @('Active Directory Tools', 'Exchange Server Tools', 'Options / Settings (Not Working)', 'Exit')
    #$info = @()
    [int]$result = displayMenu $title $choices #info
    If (($result -le 0) -or ($result -gt $choices.Length)) {$result = 0}
}

mainMenuAction ($result)