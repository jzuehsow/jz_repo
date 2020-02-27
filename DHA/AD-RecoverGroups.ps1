




$users = Import-Csv "[USER CSV DUMP]"
$userList = Import-Csv "[USERS LIST]"
$usersSearchBase = @('[OU1]','[OU2]','[OU3]')

foreach ($user in $users)
{
    $sam = $user.SAM
    $group = $user.Group
    if ($userList.Name -contains $sam)
    {
        $user = Get-ADUser $sam
        $group = (Get-ADGroup $group).Name
        $userGroups = (Get-ADPrincipalGroupMembership $user).Name
        if ($userGroups -contains $group) {Write-Host "$sam added to $group"}
        else {write-host "$user not added to $group"}
    }
}

$adUsers = @()
ForEach ($searchBase in $usersSearchBase)
{
    $adUsers += Get-ADUser -Filter * -SearchBase $searchBase
}

$adUsers.SamAccountName > "[PATH TO USERS TXT OUTPUT]"