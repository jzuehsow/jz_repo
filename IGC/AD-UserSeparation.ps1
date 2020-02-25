



Import-Module ActiveDirectory
$user = Read-Host "Enter username" | Get-ADUser
$archiveOU = "[ARCHIVED USER OU]"
$newPassword = ConvertTo-SecureString -AsPlainText "Password1234" -Force
$date = Get-Date -UFormat "%m/%d/%Y"
$username = $user.SamAccountName
$groups = Get-ADPrincipalGroupMembership $user
$manager = (Get-ADUser (Get-ADUser $user -Properties Manager).Manager).Surname

ForEach ($group in $groups)
{
    Remove-ADPrincipalGroupMembership $user -MemberOf $group -PassThru -Config:$false
}

Set-ADUser $user -Description "Archived: $date [HM: $HM]" -Manager $null
Set-ADAccountPassword $user -Reset -NewPassword $newPassword
Disable-ADAccount $user -Confirm:$false
Move-ADObject $user -TargetPath $archiveOU