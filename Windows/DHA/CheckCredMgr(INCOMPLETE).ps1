


$searchBase = '[TARGET OU]'


Function Remove_CredMgrCreds
{
    $creds = cmdkey /list | findstr Target
    ForEach ($cred in $creds)
    {
        $cred = $cred.Substring($cred.IndexOf('target=')) -replace 'target='
        cmdkey /delete:$cred
    }
}

$comps = (Get-ADComputer -Filter * -SearchBase $searchBase).Name

ForEach ($comp in $comps) {Invoke-Command -ComputerName $comp -ScriptBlock {Remove_CredMgrCreds}}
