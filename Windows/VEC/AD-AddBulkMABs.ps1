<#############################################################################################################################################################

Author:      Jeremy Zuehsow

Purpose:     This script monitors and reboots the ADFS servers for monthly patching.

Change Log: 

#############################################################################################################################################################>

Set-Location $PSScriptRoot
.".\Config\Common.ps1"
$version = '1.0'

Start_Script

Import-Module ActiveDirectory
$ErrorActionPreference = 'SilentlyContinue'
$csv = '.\NewComputers.csv'
$compList = Import-Csv -Path $csv
$ou = 'OU=MAB,OU=HELPDESK,OU=SITE,OU=REGION,DC=MICROSOFT,DC=CONTOSO,DC=COM'
$plainPassword = 'Password'
$defaultPassword = ConvertTo-SecureString $plainPassword -AsPlainText -Force
$mabVLAN = 'MAB_VLAN'
$domain = 'microsoft.contoso.com'

ForEach ($rmComp in $compList)
{
    $rmMac = $rmComp.MAC
    $rmMacUPN = $rmComp.UPN
    $rmMABDescription = $rmComp.MABDescription

    New-ADUser -Name $rmMac -GivenName $rmMac -DisplayName $rmMac -UserPrincipleName $rmMacUPN -AccountPassword $defaultPassword -AllowReversiblePasswordEncryption $true -CannotChangePassword $true -ChangePasswordAtLogon $false -Description $rmMABDescription -Enabled $false -Path $ou -PasswordNeverExpires $true
    $rmSam = (Get-ADUser -Identity $rmMac).SamAccountName
    Add-ADGroupMember $mabVLAN -Members $rmSam
    Set-ADAccountPassword -Identity $rmSam -NewPassword (ConvertTo-SecureString $rmSam -AsPlainText -Force)

    Remove-Variable rm* -Force
}