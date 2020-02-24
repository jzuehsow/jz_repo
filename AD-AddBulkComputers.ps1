


Import-Module ActiveDirectory
$ErrorActionPreference = 'SilentlyContinue'
$csv = '.\NewComputers.csv'
$ou = 'OU=COMPUTERS,OU=HELPDESK,OU=SITE,OU=REGION,DC=MICROSOFT,DC=CONTOSO,DC=COM'
$vlan = '8021x_VLAN'

Import-Csv -Path $csv | ForEach -Object {New-ADComputer -Name $_.ComputerAccount -Description $_.ComputerDescription -Path $ou -Enabled $false}
$computers = Get-ADComputer -Filter * -SearchBase $ou | Select -ExpandProperty SamAccountName
Add-ADGroupMember $vlan -Members $computers