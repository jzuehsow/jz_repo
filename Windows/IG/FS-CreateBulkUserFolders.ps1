<###############################################################################################################################

Created by Jeremy Zuehsow, 09/15/2017

The purpose of this script is to create in bulk directories for users on a share.

###############################################################################################################################>


."[PATH]]\Config\Common.ps1"
$version = '1.0'

Start_Script
Write_Banner

Import-Module ActiveDirectory
$ous =@(
    '[OU=OU1,DC=CONTOSO,DC=COM]'
    '[OU=OU2,DC=CONTOSO,DC=COM]'
    '[OU=OU3,DC=CONTOSO,DC=COM]'
    '[OU=OU4,DC=CONTOSO,DC=COM]'
)
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

Stop_Script