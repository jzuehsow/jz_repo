




################################################################################################################################
<# 

Created by Jeremy Zuehsow, 01/18/2018

The purpose of this script is to perform ongoing Active Directory maintenance actions.

Any and all changes must be run by Jeremy first, do not make changes to this script without approval and review.

v1.0 - Combined audit scripts for Schema and Enterprise Admins and Users and Computers containers. -Jeremy
v2.0 - Added function to remove users in Disabled OU from all groups except Domain Users. -Jeremy
v3.0 - Added function to archive old log files. -Jeremy
v3.1 - Removed disable user/computer and remove users from groups from Audit_Containers function.
       Corrected variable order.
       Added escape if no exempt objects found in Restricted Groups and Container Audit functions. -Jeremy
v4.0 - Added recovery csv for rollback of changes made. -Jeremy
v4.1 - Added Get_Time function. -Jeremy
v4.2 - Added Create_Log_File and Create_Recovery_File functions. -Jeremy
v4.3 - Added line to test whether user was removed from group or not. -Jeremy
v4.4 - repalced $AuditTime with 7 days - Eli
v5.0 - Added Audit_Active_Admin_Accounts, Audit_Admin_Attributes, Audit_Phone_Numbers functions. -Jeremy
v5.1 - Added function to archive old logs when a new one is created. -Jeremy
v5.2 - Improved efficiency of all functions. -Jeremy
v5.3 - Consolidate all notifications to single email. -Jeremy

#>
################################################################################################################################ 

Import-Module ActiveDirectory
Remove-Variable * -ErrorAction SilentlyContinue
$ErrorActionPreference = 'SilentlyContinue'
$year = Get-Date -Format yyyy
$month = (Get-Date -Format MM)+" "+(Get-Date -Format MMMM)
$day = Get-Date -Format ddd
$date = Get-Date -Format yyyy-MM-dd
$logServer = "HQS6-ULOGS-401"

$path = "[]"
$logPath = "$path\Logs"
$GREENOU = "[]"
$usersOU = "[]"
$groupsOU = "[]"
$contactsOU = "[]"

$adminGroups = 'Schema Admins','Enterprise Admins'
$containers = 'Computers','Users'
$exemptAdmins = @((Get-ADGroupMember '[ADMIN GROUP]').SamAccountName,(Get-ADGroupMember '[ADMIN GROUP]').SamAccountName) | Sort
$exemptObjList = @(Import-Csv "$path\Config\ExemptObjects.csv" | Sort).DN
$exemptGroups = @(Get-ADGroupMember 'Domain Admins')
$ouSARDisabled = "[]"
$ouAdminDisabled = "[]"
$ouDisabled = @($ouSARDisabled,$ouAdminDisabled)
$defaultGroup = Get-ADGroup "Domain Users"
$defaultGroupID = ($defaultGroup.SID).Value.Substring(($defaultGroup.SID).Value.LastIndexOf("-")+1)
$defaultGroupDN = $defaultGroup.DistinguishedName
$defaultGroupName = $defaultGroup.Name
$bodyArray = @()
$auditTime = (Get-Date).AddDays(-7)
$admins = Get-ADGroupMember 'Administrators' -Recursive | Get-ADUser -Properties * | Sort

function Get_Time {$Script:time = Get-Date -Format HH:mm}
function Create_Log_File
{
    $Script:logFile = "$logPath\$month - $functionName.log"
    $tries = 0
    while (!(Test-Path $logFile) -and $tries -le 5)
    {
        Start-Sleep $tries; $tries++
        New-Item $logFile -ItemType file | Out-Null
    }
}
function Create_Recovery_File
{
    $Script:recoveryFile = "$logPath\Recovery\$date - $functionName Recovery.csv"
    $tries = 0
    while (!(Test-Path $recoveryFile) -and $tries -le 5)
    {
        Start-Sleep $tries; $tries++
        New-Item $recoveryFile -ItemType file | Out-Null
        $recoveryHeader | Add-Content $recoveryFile
    }
}
function Archive_Logs
{
    $logs = Get-ChildItem $logPath | ?{$_.Name -like "*$functionName*"} | Sort LastWriteTime
    $logCount = $logs.Count
    foreach ($log in $logs)
    {
        if ($logCount -gt 1)
        {
            $writeYear = ($log.LastWriteTime).year
            $destPath = "$logPath\Maintenance\$writeYear"
            $tries = 0
            if (!(Test-Path "$destPath\$log") -and $tries -le 5)
            {
                Start-Sleep $tries
                Move-Item -Path "$logPath\$log" -Destination $destPath
                $tries++
            }
            else
            {
                $i = 0
                $dupeName = $log
                while (Test-Path "$destPath\$dupeName") {$i += 1; $dupeName = $log.basename+$i+$log.extension}
                Move-Item "$logPath\$log" -Destination "$destPath\$dupeName"
            }
            $logCount--
        }
    }
}
function Remove_From_Group
{
    $tries = 0
    if ($exemptGroups -contains $groupName) {break}
    while ((Get-ADPrincipalGroupMembership $sam).name -contains $groupName -and $tries -lt 5)
    {
        Start-Sleep $tries; $tries++
        Remove-ADPrincipalGroupMembership $sam -MemberOf $groupName -Confirm:$false | Out-Null
    }
    if (Get-ADPrincipalGroupMembership $sam -contains $groupName) {Get_Time; $Script:line = "$date $sam was NOT REMOVED from $groupName at $time."}
    else {Get_Time; $Script:line = "$date $sam was removed from $groupName at $time."}
}
function Send_Mail
{
    $MBX = "[]"
    $subject = 'AD Maintenance Notification'
    $smtp = "[]"
    $link = "<a href='$logPath'>HERE</a>"
    $bodyArray = $bodyArray -replace "$date ", ""
    $line1 = @("Active Directory maintenance actions initiated at $startTime and completed at $endTime.","`n","`n")
    $line2 = @("`n","All log files are available $link")
    $body = &{$OFS="<br/>";[string]($line1+$bodyArray+$line2)}
    Send-MailMessage -From $MBX -To $MBX -Subject $subject -BodyAsHtml $body -SmtpServer $smtp
}
function Audit_Restricted_Groups
{   
    $functionName = ($MyInvocation.MyCommand).Name -replace "_"," "
    $Script:bodyArray += $functionName
    $recoveryHeader = "{0},{1},{2}" -f "Account","Group","ModifyDate"
    Create_Log_File
    Archive_Logs
    $logArray = @()
    
    foreach ($group in $adminGroups)
    {
        if ($exemptAdmins.count -eq 0)
        {
            $line = "$date Missing Exempt Admins List."+"`r`n"
            $line | Add-Content $logFile
            $Script:bodyArray += $line
            break
        }
        
        $group = Get-ADGroup $group -Properties *
        $groupName = $group.Name
        $members = Get-ADGroupMember $group

        if ($members)
        {
            foreach ($object in $members)
            {
                $object = Get-ADObject $object -Properties *
                $objectClass = $object.objectClass
                $objectSam = $object.SamAccountName
                $objectMod = $object.Modified

                if ($exemptAdmins -match $objectSam)
                {
                    if ($objectClass -eq 'user')
                    {
                        if ($object.EmployeeNumber) {$EID = $object.EmployeeNumber}
                        elseif ($object.EmployeeID) {$EID = $object.EmployeeID}
                        else {$EID = $null}
                    }
                    
                    $user = Get-ADUser -Filter {EmployeeID -eq $EID} -Properties *
                    $userSam = $user.SamAccountName
                    $userPhone = $user.telephoneNumber
                    $userEmail = $user.EmailAddress
                    $userName = $user.GivenName, $user.Surname -join " "
                    
                    Get_Time; $line = "$date $objectSam is part of $groupName at $time. "
                    if ($userPhone -and $userEmail) {$line = $line + "Contact $userName at $userPhone or email $userEmail to ensure continued access is required."}
                    elseif ($userPhone -and !($userEmail)) {$line = $line + "Contact $userName at $userPhone to ensure continued access is required."}
                    elseif (!($userPhone) -and $userEmail) {$line = $line + "Email $userName at $userEmail to ensure continued access is required."}
                    else {$line = $line + "No POC found."}
                }
                else
                {
                    Create_Recovery_File
                    $objectSam,$group,$date | Add-Content $recoveryFile
                    $sam = $objectSam
                    Remove_From_Group
                }
                if ($line) {$logArray += $line; $line = $null}
            }
        }
        else {Get_Time; $logArray += "$date No users found in $groupName at $time."}
    }
    ($logArray += "`n") | Add-Content $logFile
    $Script:bodyArray += $logArray
}
function Audit_Containers
{
    $functionName = ($MyInvocation.MyCommand).Name -replace "_"," "
    $Script:bodyArray += $functionName
    $recoveryHeader = "{0},{1},{2}" -f "Account","Container","ModifyDate"
    Create_Log_File
    Archive_Logs
    $logArray = @()

    if ($exemptObjList.count -eq 0)
    {
        $line = "$date Missing Exempt Object List."+"`r`n" | Add-Content $logFile
        $Script:bodyArray += $line
        break
    }

    foreach ($container in $containers)
    {
        $containerDN = "CN=$container,[DOMAIN FQ]"
        $objects = Get-ADObject -Filter * -Properties * -SearchBase $containerDN | Sort
        
        foreach ($object in $objects)
        {
            $i = 0
            
            if (!($exemptObjList -contains $object.DistinguishedName))
            {
                $i++
                Create_Recovery_File
                $userEmail = $null
                $objectSAM = $object.SamAccountName
                $objectClass = $object.ObjectClass
                $objectMod = $object.Modified
                $objectCreated = $object.Created
                $objectName = if ($objectType -eq 'contact') {$object.Name} else {$objectSAM}
                $objectOwner = (Get-Acl "AD:$($object.DistinguishedName)").Owner
                $days = ((Get-Date)-$objectCreated).Days
                "{0},{1},{2}" -f $objectSAM,$container,$date | Add-Content $recoveryFile
                <#
                if ($objectClass -eq 'user') {"Move-ADObject $object -TargetPath $usersOU" | Write-Host}
                elseif ($objectClass -eq 'group') {"Move-ADObject $object -TargetPath $groupsOU" | Write-Host}
                elseif ($objectClass -eq 'contact') {"Move-ADObject $object -TargetPath $contactsOU" | Write-Host}
                else {"Move-ADObject $object -TargetPath $GREENOU" | Write-Host}
                #>
                $line = "$date The $objectClass $objectName was found in the $container container and was created $objectCreated by "
                if ($userEmail) {$line = $line + "$userFN $userLN. Please contact user at $userEmail."}
                else {$line = $line + "$objectOwner."}
                if ($line) {$logArray += $line; $line = $null}
            }
        }
        if ($i -eq 0) {Get_Time; $logArray += "$date No non-exempt objects found in $container container as of $time."}
    }
    ($logArray += "`n") | Add-Content $logFile
    $Script:bodyArray += $logArray
}
function Audit_Active_Admin_Accounts
{
    $functionName = ($MyInvocation.MyCommand).Name -replace "_"," "
    $Script:bodyArray += $functionName
    $recoveryHeader = "{0},{1},{2},{3},{4},{5}" -f "Account","Enabled","OldOU","Groups","ModifyDate"
    Create_Log_File
    Archive_Logs
    $logArray = @()

    foreach ($admin in $admins)
    {
        $adminSam = $admin.SamAccountName
        $adminDN = $admin.DistinguishedName
        $adminEnabled = $admin.Enabled
        $EID = $admin.EmployeeNumber
        
        if ($EID)
        {
            $user = Get-ADUser -Filter {EmployeeID -eq $EID} -Properties *
            $userSam = $user.SamAccountName
            $userDN = $user.DistinguishedName
            $userFN = $user.GivenName
            $userLN = $user.Surname
            
            foreach ($ou in $ouDisabled)
            {
                if($userDN -like "*$ou")
                {
                    Create_Recovery_File
                    $adminSam,$adminEnabled,$adminDN,$groups,$date | Add-Content $recoveryFile
                    $groups = Get-ADPrincipalGroupMembership $adminSam
                    $successArray = @()
                    $failedArray = @()
                    
                    foreach ($groupName in $groups.Name)
                    {
                        if ($groupName -ne $defaultGroupName) 
                        {
                            $sam = $adminSam
                            Write-Host "Remove_From_Group"
                            $line
                            if (Get-ADPrincipalGroupMembership $adminSam -contains $groupName) {$failedArray += ", $groupName"}
                            else {$successArray += ", $groupName"}
                            if ($line) {$logArray += $line; $line = $null}
                        }
                    }
                    #if ($adminEnabled -eq $true) {Disable-ADAccount $admin}
                    #if ($adminDN -NotLike "*$ouAdminDisabled") {Move-ADObject $admin -TargetPath $ouAdminDisabled}

                    $admin = Get-ADUser $admin -Properties *
                    $groupsNow = (Get-ADPrincipalGroupMembership $adminSAM).Name
                    if ($admin.Enabled -eq $false) {$a = "is disabled"}
                    else {$a = "is still enabled"}
                    if ($admin.DistinguishedName -like "*$ouAdminDisabled") {$b = "is in archive OU"}
                    else {$b = "needs to be moved to archive OU"}
                    if ($groups.count -eq 1 -and $groupsNow -eq $defaultGroupName) {$c = "has been removed from all groups."}
                    else {$c = "is still in the following groups: $failedArray" -replace ": , ", ": "}
                    Get_Time; $line = "$date $adminSam $a, $b, and $c at $time."
                    if ($line) {$logArray += $line; $line = $null}
                }
            }
        }
    }
    if (!($logArray)) {Get_Time; $logArray += "$date No admin accounts found with inactive user accounts at $time."}
    ($logArray += "`n") | Add-Content $logFile
    $Script:bodyArray += $logArray
}
function Audit_Admin_Attributes
{
    $functionName = ($MyInvocation.MyCommand).Name -replace "_"," "
    $Script:bodyArray += $functionName
    $recoveryHeader = "{0},{1},{2},{3}" -f "Account","Old_Dept","New_Dept","ModifyDate"
    Create_Log_File
    Archive_Logs
    $logArray = @()
    
    foreach ($admin in $admins)
    {
        $admin = Get-ADUser $admin -Properties *
        $adminSAM = $admin.SamAccountName
        $adminDept = $admin.Department | Out-String
        $EID = $admin.EmployeeNumber

        if ($EID)
        {
            $user = Get-ADUser -Filter {EmployeeID -eq $EID} -Properties *
            $userSAM = $user.SamAccountName
            $userDept = $user.Department | Out-String
            $userDN = $user.DistinguishedName
            $userFN = $user.GivenName
            $userLN = $user.Surname

            if ($adminDept -ne $userDept)
            {
                Create_Recovery_File
                "{0},{1},{2},{3}" -f $adminSam,$adminDept,$userDept,$date | Add-Content $recoveryFile
                Set-ADUser $admin -Replace @{Department=$userDept}
                $adminDeptNew = (Get-ADUser $admin -Properties Department).Department
                if ($adminDeptNew -eq $userDept) {Get_Time; $line = "$date $adminSAM ($userFN $userLN) department changed from $adminDept to $adminDeptNew at $time."}
                else {Get_Time; $line = "$date $adminSAM ($userFN $userLN) department failed to change from $adminDept to $userDept at $time."}
                if ($line) {$logArray += $line; $line = $null}
            }
        }
    }
    if (!($logArray)) {Get_Time; $logArray += "$date No departments changed at $time."}
    ($logArray += "`n") | Add-Content $logFile
    $Script:bodyArray += $logArray
}
function Audit_SAR_Disabled_Accounts
{
    $functionName = ($MyInvocation.MyCommand).Name -replace "_"," "
    $Script:bodyArray += $functionName
    $recoveryHeader = "{0},{1},{2},{3},{4}" -f "Account","Group","Old_Primary_Group","New_Primary_Group","ModifyDate"
    Create_Log_File
    Archive_Logs
    $logArray = @()
    $groupArray = @()
    $users = $ouDisabled | foreach {Get-ADUser -Filter "Modified -gt '$auditTime'" -SearchBase $_ -Properties *} | Sort
    
    foreach ($user in $users)
    {
        $userPrimaryGroup = $user.PrimaryGroup
        $userSam = $user.SamAccountName
        $userGroups = Get-ADPrincipalGroupMembership $user | Sort
        
        if ($userPrimaryGroup -ne $defaultGroupDN)
        {
            Create_Recovery_File
            Add-ADGroupMember $defaultGroup -Members $user
            Set-ADUser $user -Replace @{PrimaryGroupID="$defaultGroupID"} -Enabled $false
            $newPrimaryGroup = (Get-ADUser $user -Properties PrimaryGroup).PrimaryGroup
            if ($userPrimaryGroup -eq $newPrimaryGroup) {Get_Time; $line = "$date $userSam primary group was changed from $userPrimaryGroup to $newPrimaryGroup at $time."}
            else {Get_Time; $line = "$date $userSam failed to change primary group from $newPrimaryGroup to $defaultPrimaryGroup at $time."}
            "{0},{1},{2},{3},{4}" -f $userSam,$null,$defaultPrimaryName, $newPrimaryName,$date | Add-Content $recoveryFile
            if ($line) {$logArray += $line; $line = $null}
        }
        
        foreach ($groupName in $userGroups.Name)
        {            
            if ($groupName -ne $defaultGroupName)
            {
                Create_Recovery_File
                "{0},{1},{2},{3},{4}" -f $userSam,$groupName,$null,$null,$date | Add-Content $recoveryFile
                $sam = $userSam
                Remove_From_Group
                if ($line) {$logArray += $line; $line = $null}
            }
        }
    }
    if (!($logArray)) {Get_Time; $logArray += "$date No disabled users found in groups at $time."}
    ($logArray += "`n") | Add-Content $logFile
    $Script:bodyArray += $logArray
}
function Audit_Phone_Numbers
{
    $functionName = ($MyInvocation.MyCommand).Name -replace "_"," "
    $Script:bodyArray += $functionName
    Create_Log_File
    Archive_Logs
    $logArray = @()
    $i = $null; $j = $null; $k = $null
    $users = Get-ADUser -Filter {Enabled -eq "True" -and EmployeeID -NotLike "*N/A*" -and Modified -gt $auditTime} -Properties * | ?{$_.DistinguishedName -notlike "*LEGATS*"} | Sort
    
    if ($day -eq 'Mon')
    {
        $phoneDump = "$logpath\$date - $functionName.csv"
        New-Item $phoneDump -ItemType file | Out-Null
        "{0},{1},{2},{3}" -f "Account","Office","Mobile","Home" | Add-Content $phoneDump
    }

    foreach ($user in $users)
    {
        $sam = $user.SamAccountName
        $userFN = $user.GivenName
        $userLN = $user.Surname
        $officePhone = $user.OfficePhone
        $mobilePhone = $user.MobilePhone
        $homePhone = $user.HomePhone
        $officePhoneNew = "{0:000-000-0000}" -f (($officePhone -replace "[^0-9]")/1)
        $mobilePhoneNew = "{0:000-000-0000}" -f (($mobilePhone -replace "[^0-9]")/1)
        $homePhoneNew = "{0:000-000-0000}" -f (($homePhone -replace "[^0-9]")/1)
            
        if ($officePhone -eq $officePhoneNew) {$officePhone = $null}
        elseif ($officePhoneNew.length -eq 12 -and $officePhone)
        {
            Set-ADUser $user -OfficePhone $officePhoneNew
            $line = "$date $sam's office number changed from $officePhone to $officePhoneNew"
            $j++
        }
        elseif ($officePhone) {$i++}
            
        if ($mobilePhone -eq $mobilePhoneNew) {$mobilePhone = $null}
        elseif ($mobilePhoneNew.length -eq 12 -and $mobilePhone)
        {
            Set-ADUser $user -MobilePhone $mobilePhoneNew
            $line = "$date $sam's mobile number changed from $mobilePhone to $mobilePhoneNew"
            $j++
        }
        elseif ($mobilePhone) {$i++}
            
        if ($homePhone -eq $homePhoneNew) {$homePhone = $null}
        elseif ($homePhoneNew.length -eq 12 -and $homePhone)
        {
            Set-ADUser $user -HomePhone $homePhoneNew
            $line = "$date $sam's home number changed from $homePhone to $homePhoneNew"
            $j++
        }
        elseif ($homePhone) {$i++}
            
        if (($day -eq 'Mon') -and (($officePhone) -or ($mobilePhone) -or ($homePhone) -or ($telephone))) {"$sam,$officePhone,$mobilePhone,$homePhone" | Add-Content $phoneDump}
        if ($line) {$logArray += $line; $line = $null}
        $officePhone = $null; $mobilePhone = $null; $homePhone = $null
    }
    
    if (($k = $i+$j) -gt 0)
    {
        if (!($j)) {$j = 'No'}
        Get_Time; $logArray += "$date In the past 7 days, there were $k OCONUS phone numbers formatted incorrectly at $time. $j number formats were corrected."
    }
    else {Get_Time; $logArray += "$date In the past 7 days, no OCONUS phone numbers were formatted incorrectly at $time."}
    ($logArray += "`n") | Add-Content $logFile
    $Script:bodyArray += $logArray
}

$startTime = Get-Date -Format HH:mm
#Audit_Restricted_Groups
#Audit_Containers
Audit_Active_Admin_Accounts
Audit_Admin_Attributes
#Audit_SAR_Disabled_Accounts
Audit_Phone_Numbers
$endTime = Get-Date -Format HH:mm
Send_Mail