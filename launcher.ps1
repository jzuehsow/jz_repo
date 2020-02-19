#launcher for scripts
#Needs Review
#List choices based on list of subfolders - ad, exch, file, etc


cd $PSScriptRoot
$configFile = 'config.ini'
.".\config\common.ps1"
$configFQName = Get-ChildItem -Path config\config.ini | Select-Object FullName

$configData = @()
$configData = setConfigData $configFQName.FullName.ToString()

Function MainMenuAction ($result)
{
    Switch ($result)
    {
        1 {& ".\ActiveDirectory\ActiveDirectoryLauncher.ps1" -configData $configData -ConnectTo Exchange $false}
        2 {& ".\Exchange\ExchangeLauncher.ps1" -configData $configData -ConnectToExchange $true}
        3 {#Options / Settings}
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

mainMenuAction