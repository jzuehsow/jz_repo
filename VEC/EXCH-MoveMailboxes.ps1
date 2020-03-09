<###############################################################################################################################

Created by: Jeremy Zuehsow

The purpose of this script is to 

v1.0 - 

###############################################################################################################################>


Set-Location $PSScriptRoot
.".\Config\Common.ps1"
$version = '1.0'

Start_Script
New_ExchangeSession


$searchBase = [USERS OU]
$users = Get-ADUser -Filter * -SearchBase $searchBase

ForEach ($user in $users)
{
    $sam = $user.SamAccountName
    $mbx = (Get-Mailbox $sam).Database

    If ($mbx)
    {
        switch ($mbx)
        {
            '[OLD DB]'
            {
                New-MoveRequest $sam -TargetDatabase $newDB
                Write-Host $sam "$mbx database moved to $newDB"
            }
            '[OLD VIP]'
            {
                New-MoveRequest $sam -TargetDatabase $newVIPDB
                Write-Host $sam "mbx database moved to $newVIPDB"
            }
            default (Write-Host "$sam with mailbox $mbx")
        }
    }
}