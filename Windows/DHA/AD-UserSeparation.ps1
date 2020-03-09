








$log = "[LOG PATH]\Separations"

##############################################################################################################################################################
# Data Input & Exchange Conneection
##############################################################################################################################################################

$i = 0
$tmpfile = Get-Date -format yyMMddHHmmss ; $tmpfile =  "$env:LOCALAPPDATA\$tmpfile.txt"
New-Item $tmpfile -ItemType File > $null

If (!(Test-Path $tmpfile)){Write-Host "An error has occured. Add members manually." -F Red;Pause;Exit}

Clear-Host;$banner    
Write-Host "Press enter to launch notepad. Add each users EmployeeID or SamAccountName to notepad, one per line." -F Yellow
Write-Host "The script will continue once notepad is saved and closed. Select save, NOT save as." -F Yellow -NoNewline ; Read-Host " ";""
Invoke-Item $tmpfile

    If (!(Get-Command Get-Mailbox))
    {
    $ProgressPreference = "SilentlyContinue"
        $exsvrs = (Get-ADComputer -Filter {Name -like "*-UO365-*"}).Name
        Foreach ($exsvr in $exsvrs)
        {
            If (Test-Connection $exsvr -Count 2)
            {
            $session = New-PSSession -ConfigurationName Microsoft.Exchange -ConnectionUri http://$exsvr.[DOMAIN]/Powershell/
            Import-PSSession $session -DisableNameChecking -AllowClobber -Verbose:$false > $null       
                If (Get-Command Get-Mailbox){Break}
            }
        }
    $ProgressPreference = "Continue"
    }
    If (!(Get-Command Get-Mailbox)){Write-Host "Connection to exchange failed. Please try again." -F Red;Pause;Exit}

Do{$objects = Get-Content $tmpfile;Start-Sleep 1;$i++;If($i -eq 300){Write-Host "The script has been paused." -F Green;Pause}} Until ($objects -or $i -eq 300)
If ($i -eq 300){$objects = Get-Content $tmpfile ; If (!$objects){Write-Host "An error has occured. Members will not be added to the group." -F Red;Pause;Exit}}
""
##############################################################################################################################################################
# Actions
##############################################################################################################################################################

Foreach ($object in $objects)
{
Remove-Variable rm* -Force
$object = ($object.ToUpper()).Trim()

$eid = $(try {(get-aduser $object -Properties EmployeeID).EmployeeID} catch {$null});If (!$eid){$eid = $object}

    If ($eid -like "?????????")
    {
    $rmusers1 = $(try {(get-aduser -filter {EmployeeID -eq $eid}).SamAccountName} catch {$null})
    $rmusers2 = $(try {(get-aduser -filter {EmployeeNumber -eq $eid}).SamAccountName} catch {$null})
        If ($rmusers2){$rmusers = @();$rmusers += $rmusers1;$rmusers += $rmusers2}Else{$rmusers = $rmusers1}
        If (!$rmusers){Write-Host "No accounts found for EmployeeID $eid." -F Red}
    }
    Else
    {
    Write-Host "$eid is not a valid EID." -F Red
    }

        Foreach ($rmuser in $rmusers)
        {
        $memberof = $null
        $rmprop = Get-ADUser $rmuser -Properties SamAccountName,DistinguishedName,Description,LastLogonDate,MemberOf
        Foreach ($group in $rmprop.MemberOf){Remove-ADGroupMember -Identity $group -Member $rmuser -Confirm:$false;$memberof = $memberof + "$group ,"}
        If ($memberof){$memberof = $memberof.TrimEnd(", ")}

        Disable-ADAccount $rmuser
        Set-ADUser $rmuser -Description "SAR Disabled - $date"
        Set-ADUser $rmuser -Clear "extensionattribute6"
        Get-ADuser $rmuser  | Move-ADObject -TargetPath "[SAR TERM OU]"
        If (Get-Remotemailbox $rmuser -WA SilentlyContinue -EA SilentlyContinue){Set-Remotemailbox $rmuser -HiddenFromAddressListsEnabled $true -WA SilentlyContinue -EA SilentlyContinue}

    
        $hash =[pscustomobject]@{ 
        SamAccountName = $rmprop.SamAccountName
        DistinguishedName = $rmprop.DistinguishedName
        Description = $rmprop.Description
        LastLogonDate = $rmprop.LastLogonDate
        MemberOf = $memberof   
        }
        $hash | export-csv "$log\$rmuser.csv" -NoTypeInformation -Append
        $hash = @{}

        Write-Host "Seperated user $rmuser." -F Green
        }
}

##############################################################################################################################################################
# End
##############################################################################################################################################################

"";"";"";""
Write-Host "----------------------------------------------------------------------------------------------------------------" -F Green
Write-Host "Separations complete........." -F Green
Write-Host "----------------------------------------------------------------------------------------------------------------" -F Green

Remove-Variable rm* -Force ; Get-PSSession | Remove-PSSession ; Pause
