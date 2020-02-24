


Import-Module ActiveDirectory
$ou1 = [OU DISTINGUISHED NAME]
$ou2 = ""
$ou3 = ""
$ou4 = ""
$folderPath = [Folder Path]

ForEach ($ou in $ous) 
{
    ForEach ($rmUser in (Get-ADUser -Filter * -SearchBase $ou))
    {
        $rmSam = $rmUser.SamAccountName
        $newFolder = "$folderPath\$rmSam"

        If (!(Test-Path $newFolder)) {New-Item $newFolder -ItemType Directory | Out-Null}
        icacls $newFolder /inheritance:r
        icacls $newFolder /grant:r "System:(OI)(CI)F"
        icacls $newFolder /grant:r "Administrators:(OI)(CI)F"
        icacls $newFolder /grant:r ($sam + ':(OI)CI)M')
    }
}