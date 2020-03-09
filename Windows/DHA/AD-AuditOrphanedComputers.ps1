




Import-Module ActiveDirectory
$ErrorActionPreference = 'SilentlyContinue'
$month = (Get-Date -Format MM)+" "+(Get-Date -Format MMMM)
$path = '[MONITORING SCRIPTS PATH]'
$logPath = "$path\Logs"
$logFile = "$logPath\$month - Audit Computers-Orphaned OU.csv"
Do {New-Item $logFile -ItemType file | Out-Null}
Until (Test-Path $logFile)
$auditTime = (Get-Date).AddDays(-60)
$date = Get-Date -Format yyyy-MM-dd
$searchBase = '[ORPHANED COMPUTERS OU]'
$comps = Get-ADComputer -Filter * -Properties * -SearchBase $searchBase | Sort Created -Descending
$i=0
$comps = Get-ADComputer -Filter "Modified -gt '$auditTime'" -Properties * -SearchBase $searchBase | Sort Created -Descending

foreach ($comp in $comps)
{    
    if ($comp.Name -notmatch "....-U.-.......")
    {
        $rmCompName = $comp.Name
        $rmCompCreated = $comp.Created
        $rmCompLastLogon = $comp.LastLogonDate
        $rmCompOwner = (Get-Acl "AD:$($comp.DistinguishedName)").Owner -replace '[DOMAIN PREFIX]\\'
        if ($rmCompOwner -notlike "*S-1-5*" -and $rmCompOwner -ne 'Domain Admins' -and $rmCompOwner -ne '[SVC ACCT SCCM MGR]' -and $rmCompOwner -ne '[SVC ACCT TASK MGR]')
        {
            $rmAdmin = Get-ADUser $rmCompOwner -Properties *
            if ($rmAdmin.EmployeeNumber) {$rmEID = $rmAdmin.EmployeeNumber}
            elseif ($rmAdmin.EmployeeID) {$rmEID = $rmAdmin.EmployeeID}
            else {Write-Host "No EID found."}
            
            $rmUser = Get-ADUser -Filter {EmployeeID -eq $rmEID} -Properties *
            $rmUserName = $rmUser.GivenName+" "+$rmUser.Surname
            $rmUserEmail = $rmUser.EmailAddress
            $rmSubject = "ALERT: Computer Object Found in Computers-Orphaned OU"
            $rmBody =
                "
                $rmUserName,

                The following computer object was found in the Computers-Orphaned OU. Please rename the object and remove it from the OU.

                Computer Name: $rmCompName
                Created Date: $rmCompCreated
                Created By: $rmCompOwner

                Thank you,

                Active Directory Team
                "
            write-host "Send-MailMessage -To $rmUserEmail -From '[FROM EMAIL]' -Subject $rmSubject -Body $rmBody -SmtpServer $smtp"
            #"$rmCompName - $rmUserEmail"
            $i++
        
        }
        else {Write-Host "No admin found for $rmCompName."}
        
        #Write-Host "$computerOwner ($userName) created $computerName on $computerCreated. Please contact $userName at $userEmail.`nLast Modified $computerModified.`n"
        Remove-Variable rm* -Force
    }
    #$logFile | Add-Content "$i computer objects found in Computers-Orphaned OU."
}
$i