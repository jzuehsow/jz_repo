<###############################################################################################################################

Created by: Jeremy Zuehsow

Summary: Import CSV of new computers to add to AD environment.

v1.1 - Added comments to variables; Modified way the script imports CSV and creates computer objects

###############################################################################################################################>


Set-Location $PSScriptRoot
.".\Config\Common.ps1"
$version = '1.1'

Start_Script

#IF STATEMENT TO GET CSV; MANDATORY CSV HEADERS?
$csv = '.\NewComputers.csv'

#IF STATEMENT TO TARGET OU
$ou = 'OU=COMPUTERS,OU=HELPDESK,OU=SITE,OU=REGION,DC=MICROSOFT,DC=CONTOSO,DC=COM'

#OPTIONAL
$vlan = '8021x_VLAN'

$newComputers = Import-Csv -Path $csv
ForEach ($computer in $newComputers)
{
    New-ADComputer $_.ComputerName -Description $_.Description -Path $computersOU -Enabled $false
    Add-ADGroupMember $vlan -Members $computer
}