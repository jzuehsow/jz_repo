


Import-Module ActiveDirectory
$ou1 = [OU_DISTINGUISHED_NAME]
$ou2 = ""
$ou3 = ""
$ou4 = ""
$ous = (Get-Variable ou?).Name
$folderPath = [Folder_Path]

ForEach ($ou in $ous)
{
    $rmSams = (Get-ADUser -Filter * -SearchBase $ou).SamAccountName

    ForEach ($rmSam in $rmSams)
    {
        $newFolder = "$folderPath\$rmSam"

        If (!(Test-Path $newFolder)) {New-Item $newFolder -ItemType Directory | Out-Null}
        icacls $newFolder /inheritance:r
        icacls $newFolder /grant:r "System:(OI)(CI)F"
        icacls $newFolder /grant:r "Administrators:(OI)(CI)F"
        icacls $newFolder /grant:r ($sam + ':(OI)(CI)M')
    }
}