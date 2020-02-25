




Import-Module ActiveDirectory
$ErrorActionPreference = 'SilentlyContinue'
$session = New-PSSession -ConfigurationName Microsoft.Exchange -ConnectionUri http://[EXCHANGE SERVER FQDN]/PowerShell -Authentication Kerberos -Credentials $creds
Import-PSSession $session
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