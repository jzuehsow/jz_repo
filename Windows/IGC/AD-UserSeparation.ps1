<###############################################################################################################################

Created by Jeremy Zuehsow, 10/15/2016

The purpose of this script is to perform all separation tasks when a user leaves the company.

###############################################################################################################################>


."[PATH]]\Config\Common.ps1"
$version = '1.0'

Start_Script
Write_Banner

Import-Module ActiveDirectory
$user = Read-Host "Enter username" | Get-ADUser
$archiveOU = <ARCHIVED USER OU>
$newPassword = ConvertTo-SecureString -AsPlainText "Password1234" -Force
$date = Get-Date -UFormat "%m/%d/%Y"
$groups = Get-ADPrincipalGroupMembership $user
#$manager = (Get-ADUser (Get-ADUser $user -Properties Manager).Manager).Surname

ForEach ($group in $groups)
{
    Remove-ADPrincipalGroupMembership $user -MemberOf $group -PassThru -Config:$false
}

Set-ADUser $user -Description "Archived: $date [HM: $HM]" -Manager $null
Set-ADAccountPassword $user -Reset -NewPassword $newPassword
Disable-ADAccount $user -Confirm:$false
Move-ADObject $user -TargetPath $archiveOU