



[CmdletBinding()]
param 
(
    [Parameter(Mandatory = $false)]
    [hashtable]$configData
)


cd $PSScriptRoot
."..\..\config\common.ps1"

If (!($configData))
{
    $configFQName = Get-ChildItem -Path ..\..\config\config.ini | Select-Object FullName
    $configData = @()
    $configData = setConfigData $configFQName.FullName.ToString()
}

loadADModule

$domain = Get-ADDomain
$domainName = $domain.Name
$domainDN = $domain.DistinguishedName
$domain = [DOMAIN]

$searchBase = $configData.WorkstationOU
$dcString = $configData.DomainControllers.Get(0).Substring(1,10)
$date = Get-Date -Format ddMMMyy
$csvPath = $configData.LogDirectory + "\LogonServerCapture-$date.csv"

If (!(Test-Path $csvPath))
{
    $csvColumns = "Computer Name, IP Address, Command, Output"
    Add-Content $csvPath $csvColumns -Force
}

$computers = Get-ADComputer -Filter * -SearchBase $searchBase

$x = 0
ForEach ($computer in $computers)
{
    $computerName = $computer.Name
    $computersCount = $computers.$computersCount

    Try {$hostIP = [System.Net.DNS]::GetHostByName($computer.Name).AddressList[0].IPAddressToString}
    Catch {Write-Host "$computerName not found in DNS. Remove from Active Directory. Annotating in the log." -F Yellow}

    If (!(isComputerOnline $computer.Name))
    {
        Write-Host "Remove Computer $computerName is Offline." -F Red
    }
    Else
    {
        [string]$hostLS = nltest /sc_query:$domainName /server:$computerName
    }

    $computerDN = $computer.DistinguishedName
    
    Try
    {
        Write-Host "Updated Group Policy for: $computerName" -F Green
        If (!(hostLS.Contains($dcString)))
        {
            Write-Host "$computerName is not authenticating with the FOB" -F Yellow
            Write-Host "####################" -F Yellow
            Shutdown /m \\$computerName /r /t 900 /c "Your computer received an update and must be rebooted within 15 minutes."
            Write-Host $hostLS -F DarkYellow
            Write-Host "Updated GP and Restarting: $computerName." -F Yellow
            Write-Host "####################" -F Yellow
        }
        Else
        {
            Write-Host "Updated GP and not Restarting: $computerName" -F Green
        }

        Add-Content $csvPath "$computerName, $hostIP, nltest /sc_query:$domainName /server:$computerName, $hostLS"
    }
    Catch
    {
        Write-Host "Unable to apply GP for: $computerName." -F Yellow
    }

$x += 1
[int]$percentComplete = ($x / $computersCount)*100
$output = "$x of $computersCount complete ($percentComplete %)"
Write-Output $output
}

& '..\ActiveDirectoryLauncher.ps1' -configData $configData