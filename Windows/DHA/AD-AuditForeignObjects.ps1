




$contactsOU = "[CONTACTS OU]"
$usersOU = "[USERS OU]"
$groupsOU = "[GROUPS OU]"
$computersOU = "[COMPUTERS OU]"

$contacts = Get-ADObject -Filter (ObjectClass -eq 'contact') -SearchBase $contactsOU
$users = Get-ADUser -Filter * -SearchBase $endusersOU
$groups = Get-ADObject -Filter (ObjectClass -like 'group') -SearchBase $groupsOU
$computers = Get-ADComputer -Filter * -SearchBase $computersOU

$contactsForeignObj = Get-ADObject -Filter (ObjectClass -ne 'contact') -SearchBase $contactsOU
$usersForeignObj = Get-ADObject -Filter (ObjectClass -ne 'user') -SearchBase $endusersOU
$groupsForeignObj = Get-ADObject -Filter (ObjectClass -notlike 'group') -SearchBase $groupsOU
$computerForeignObj = Get-ADObject -Filter (ObjectClass -ne 'computer') -SearchBase $computersOU

$contactsForeignObj.count
$usersForeignObj.count
$groupsForeignObj.count
$computerForeignObj.count

$contacts.count
$users.count
$groups.count
$computers.count