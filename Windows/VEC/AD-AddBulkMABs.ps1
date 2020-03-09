



Import-Module ActiveDirectory
$ErrorActionPreference = 'SilentlyContinue'
$compList = '.\NewComputers.csv'
$ou = 'OU=MAB,OU=HELPDESK,OU=SITE,OU=REGION,DC=MICROSOFT,DC=CONTOSO,DC=COM'
$defaultPassword = ConvertTo-SecureString 'Password' -AsPlainText -Force
$mabVLAN = 'MAB_VLAN101'
$domain = 'microsoft.contoso.com'

ForEach ($item in $compList)
{
    $mac = $item.MAC
    $macUPN = $item.UPN
    $mabDescription = $item.MABDescription

    New-ADUser -Name $mac -GivenName $mac -DisplayName $mac -UserPrincipleName $macUPN -AccountPassword $defaultPassword -AllowReversiblePasswordEncryption $true `
    -CannotChangePassword $true -ChangePasswordAtLogon $false -Description $mabDescription -Enabled $false -Path $ou -PasswordNeverExpires $true
    $sam = (Get-ADUser -Identity $mac).SamAccountName
    Add-ADGroupMember $mabVLAN -Members $sam
    Set-ADAccountPassword -Identity $sam -NewPassword (ConvertTo-SecureString $sam -AsPlainText -Force)
}