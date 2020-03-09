




#########################################################################################################################################################
<#

This script allows non admin personel, who do not have access to Active Directory, 
the ability to manage members of a security group that they manage. 

9/15/17 - Added the abilty for group managers to add and remove other mangers.

#>
#########################################################################################################################################################

Clear-Host
Remove-Variable rm* -Force

$pshost = get-host
$pswindow = $pshost.UI.RawUI
$newsize = $pswindow.BufferSize
$newsize.Height = 65
$newsize.Width = 120
$pswindow.BufferSize = $newsize
Mode 120

$pdc = Get-ADDomain | Select-Object PDCEmulator
$pdc = $pdc.PDCEmulator
$PSDefaultParameterValues = @{"*-AD*:Server"="$pdc"}

$ErrorActionPreference = "Continue"
$WarningPreference = "Continue"

$version = "2.0"

$banner = " ----------------------------------------------------------------------------------------------------------------------
 ----------------------------------------------------------------------------------------------------------------------                                                                                                                        

                                      Manage Security Group - Version $version
                                                                                                                                                                              
 ----------------------------------------------------------------------------------------------------------------------
 ----------------------------------------------------------------------------------------------------------------------"

 "$banner"

#########################################################################################################################################################
## Security Group Input
#########################################################################################################################################################
"";""
Do
{

Do 
{
$groupname = Read-Host "Enter the name of a security group to be viewed or modified"
If (!($(try {(Get-ADGroup $groupname)} catch {$null}))){Write-Host "Invalid group name." -F Red}
}
Until ($(try {(Get-ADGroup $groupname)} catch {$null}))

#########################################################################################################################################################
## Action Option. 
#########################################################################################################################################################

Do 
{
Remove-Variable rm* -Force;Clear-Host;$banner;"";""

Write-Host "Membership" -F Magenta
Write-Host "1. View all members." -F Green
Write-Host "2. Add a member." -F Green
Write-Host "3. Remove a member." -F Green
""
Write-Host "Mangers" -F Magenta
Write-Host "4. View all managers." -F Green
Write-Host "5. Set primary manager." -F Green
Write-Host "6. Add secondary manager." -F Green
Write-Host "7. Remove a secondary manager." -F Green
""
Write-Host "8. Mange another group." -F Green
Write-Host "9. Exit script." -F Green
""
Do
{
$rmselection = Read-Host "Choose option number from above and press Enter"
    If ($rmselection -notlike "[1-9]"){Write-Host "Invalid selection." -F Red}
}
Until ($rmselection -like "[1-9]")

#########################################################################################################################################################
## View group memmbers
#########################################################################################################################################################

If ($rmselection -eq "1")
{
"";Write-Host "Below are the group members:" -F Green
$rmusers = (Get-ADGroupMember -Identity $groupname).SamAccountName
"";$i = 1
Foreach ($rmuser in $rmusers){Write-host "$i. $rmuser" -F Magenta;$i++};""
Pause     
}

#########################################################################################################################################################
## Add member to group
#########################################################################################################################################################

If ($rmselection -eq "2")
{
    ""    
    Do
    {
    $rmuser = Read-Host "Enter the user name being added to the group or press c to cancel"        
        If (!($(try {(get-aduser $rmuser)} catch {$null}))){Write-Host "Invalid username." -F Red}
    }
    Until ($(try {(get-aduser $rmuser)} catch {$null}) -or $rmuser -eq "c")

        If ($rmuser -ne "c")
        {
        Add-ADGroupMember -Identity $groupname -Members $rmuser
    
            ""
            If (Get-ADGroupMember $groupname | Where {$_.SamAccountName -eq $rmuser})
            {
            Write-Host "$rmuser added to group." -F Green
            }
            Else
            {
            Write-Host "Unable to add user $rmuser to group. Pleae try again." -F Red
            }
            ""
        Pause
        }
}

#########################################################################################################################################################
## Remove member from group
#########################################################################################################################################################

If ($rmselection -eq "3")
{
""
Write-Host "Below are the group members:" -F Green
$rmusers = (Get-ADGroupMember -Identity $groupname).SamAccountName
""
$i = 1
    
    Foreach ($rmuser in $rmusers)
    {
    New-Variable -Name rmuser$i -Value $rmuser
    Write-host "$i. $rmuser" -F Magenta
    $i++
    }
    ""     
        
        Do
        {
        $rmlinenumber =  Read-Host "Enter the line number of the user being removed and press enter or press C to cancel"
            If ($rmlinenumber -notlike "[0-9]*" -and $rmlinenumber -notlike "c")
            {
            Write-Host "Invalid line number." -F Red
            }        
        }
        Until ($rmlinenumber -like "[0-9]*" -or $rmlinenumber -like "c")
     
            If ($rmlinenumber -notlike "c")
            {
            $rmuser = Get-Variable -Name rmuser$rmlinenumber -ValueOnly
    
            Remove-ADGroupMember -Identity $groupname -Members $rmuser -Confirm:$false
                ""
                If (!(Get-ADGroupMember $groupname | Where {$_.SamAccountName -eq $rmuser}))
                {
                Write-Host "$rmuser removed from group" -F Green
                }
                Else
                {
                Write-Host "Unable to remove user $rmuser from group. Pleae try again." -F Red
                }
                ""
            Pause
            }
}

#########################################################################################################################################################
## View group managers
#########################################################################################################################################################

If ($rmselection -eq "4")
{
New-PSDrive -Name mailscript -PSProvider ActiveDirectory -Root //RootDSE/ -ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null
$secgppath = "mailscript:\" + ((Get-ADGroup $groupname).distinguishedname)
$rmacl = (get-acl $secgppath).Access | Where {$_.IsInherited -eq $false -and $_.IdentityReference -like "fbi\*" -and $_.ActiveDirectoryRights -eq "WriteProperty"}
If ($rmacl) {$rmmanagers = $rmacl.IdentityReference.Value}
Remove-PSDrive mailscript -ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null

"";Write-Host "Below are the group managers:" -F Green;"";$i = 1
Foreach ($item in $rmmanagers){$rmmanager = $item.Split("\")[1] ; Write-host "$i. $rmmanager" -F Magenta ; $i++}""
Pause     
}

 #########################################################################################################################################################
## Set primary manager
#########################################################################################################################################################

If ($rmselection -eq "5")
{
""
    Do
    {
    $rmmanager = Read-Host "Enter the username being set as primary manger or press C to cancel"
        If (!($(try {(get-aduser $rmmanager)} catch {$null})))
        {
        Write-Host "Invalid username." -F Red
        }
    }
    Until ($(try {(get-aduser $rmmanager)} catch {$null}) -or $rmmanager -eq "c")


    If ($rmmanager -ne "c")
    {
    Set-ADGroup $groupname -ManagedBy $rmmanager

    New-PSDrive -Name mailscript -PSProvider ActiveDirectory -Root //RootDSE/ -Server $pdc -ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null
    $secgppath = "mailscript:\" + ((Get-ADGroup $groupname).distinguishedname)
    $rmacl = get-acl $secgppath
    $manager = Get-ADuser $rmmanager
    $sid = new-object System.Security.Principal.SecurityIdentIfier $manager.SID
    $objectguid = new-object Guid  bf9679c0-0de6-11d0-a285-00aa003049e2
    $identity = [System.Security.Principal.IdentityReference] $sid
    $adRights = [System.DirectoryServices.ActiveDirectoryRights] "WriteProperty"
    $type = [System.Security.AccessControl.AccessControlType] "Allow"
    $ace = new-object System.DirectoryServices.ActiveDirectoryAccessRule $identity,$adRights,$type,$objectguid
    $rmacl.AddAccessRule($ace)
    Set-acl -aclobject $rmacl $secgppath
    
        $dn = (Get-ADUser $rmmanager -Properties DistinguishedName).DistinguishedName
        If (Get-ADGroup $groupname -Properties ManagedBy | Where {$_.ManagedBy -eq $dn})
        {
        Write-Host "$rmmanager set as primary manager." -F Green
        }
        Else
        {
        Write-Host "Unable to set $rmmanager as primary manager." -F Red
        }

    Pause
    ""
    }
}

#########################################################################################################################################################
## Add a manager to group
#########################################################################################################################################################

If ($rmselection -eq "6")
{
""
    Do
    {
    $rmmanager = Read-Host "Enter the username being added as a secondary manager or press C to cancel"
        If (!($(try {(get-aduser $rmmanager)} catch {$null})))
        {
        Write-Host "Invalid username." -F Red
        }
    }
    Until ($(try {(get-aduser $rmmanager)} catch {$null}) -or $rmmanager -eq "c")
    
    If ($rmmanager -ne "c")
    {
    New-PSDrive -Name mailscript -PSProvider ActiveDirectory -Root //RootDSE/ -Server $pdc -ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null
    $secgppath = "mailscript:\" + ((Get-ADGroup $groupname).distinguishedname)
    $rmacl = get-acl $secgppath
    $manager = Get-ADuser $rmmanager
    $sid = new-object System.Security.Principal.SecurityIdentIfier $manager.SID
    $objectguid = new-object Guid  bf9679c0-0de6-11d0-a285-00aa003049e2
    $identity = [System.Security.Principal.IdentityReference] $sid
    $adRights = [System.DirectoryServices.ActiveDirectoryRights] "WriteProperty"
    $type = [System.Security.AccessControl.AccessControlType] "Allow"
    $ace = new-object System.DirectoryServices.ActiveDirectoryAccessRule $identity,$adRights,$type,$objectguid
    $rmacl.AddAccessRule($ace)
    Set-acl -aclobject $rmacl $secgppath

    $secgppath = "mailscript:\" + ((Get-ADGroup $groupname).distinguishedname)
    $rmacl = (get-acl $secgppath).Access | Where {$_.IsInherited -eq $false -and $_.IdentityReference -eq "FBI\$rmmanager" -and $_.ActiveDirectoryRights -eq "WriteProperty"}
    Remove-PSDrive mailscript -ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null
        
        ""
        If ($rmacl)
        {
        Write-Host "$rmmanager added as a manager." -F Green
        }
        Else
        {
        Write-Host "Unable to add $rmmanager as a manager. Please try again." -F Red
        }
        ""
    Pause
    }      
}

#########################################################################################################################################################
## Remove manger from group
#########################################################################################################################################################

If ($rmselection -eq "7")
{
New-PSDrive -Name mailscript -PSProvider ActiveDirectory -Root //RootDSE/ -Server $pdc -ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null
$secgppath = "mailscript:\" + ((Get-ADGroup $groupname).distinguishedname)
$rmacl = (get-acl $secgppath).Access | Where {$_.IsInherited -eq $false -and $_.IdentityReference -like "fbi\*" -and $_.ActiveDirectoryRights -eq "WriteProperty"}
If ($rmacl) {$rmmanagers = $rmacl.IdentityReference.Value}
Remove-PSDrive mailscript -ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null

""
Write-Host "Below are the group managers:" -F Green
""
    $i = 1
    Foreach ($item in $rmmanagers)
    {
    $rmmanager = $item.Split("\")[1] ; Write-host "$i. $rmmanager" -F Magenta
    New-Variable -Name rmmanager$i -Value $rmmanager
    $i++
    }
    ""         
        Do
        {
        $rmlinenumber =  Read-Host "Enter the line number for the manager being removed or press C to cancel"
            If ($rmlinenumber -notlike "[0-9]*" -and $rmlinenumber -notlike "c")
            {
            Write-Host "Invalid line number." -F Red
            }        
        }
        Until ($rmlinenumber -like "[0-9]*" -or $rmlinenumber -like "c")
     
    If ($rmlinenumber -ne "c")
    {
    $rmmanager = Get-Variable -Name rmmanager$rmlinenumber -ValueOnly
    
    New-PSDrive -Name mailscript -PSProvider ActiveDirectory -Root //RootDSE/ -Server $pdc -ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null
    $secgppath = "mailscript:\" + ((Get-ADGroup $groupname).distinguishedname)
    $rmacl = get-acl $secgppath
    $manager = Get-ADuser $rmmanager
    $sid = new-object System.Security.Principal.SecurityIdentIfier $manager.SID
    $objectguid = new-object Guid  bf9679c0-0de6-11d0-a285-00aa003049e2
    $identity = [System.Security.Principal.IdentityReference] $sid
    $adRights = [System.DirectoryServices.ActiveDirectoryRights] "WriteProperty"
    $type = [System.Security.AccessControl.AccessControlType] "Allow"
    $ace = new-object System.DirectoryServices.ActiveDirectoryAccessRule $identity,$adRights,$type,$objectguid
    $rmacl.RemoveAccessRule($ace) > $null
    Set-acl -aclobject $rmacl $secgppath
    
    $secgppath = "mailscript:\" + ((Get-ADGroup $groupname).distinguishedname)
    $rmacl = (get-acl $secgppath).Access | Where {$_.IsInherited -eq $false -and $_.IdentityReference -eq "FBI\$rmmanager" -and $_.ActiveDirectoryRights -eq "WriteProperty"}
    Remove-PSDrive mailscript -ErrorAction SilentlyContinue -WarningAction SilentlyContinue > $null
        
        ""
        If (!$rmacl)
        {
        Write-Host "$rmmanager removed as manager." -F Green
        }
        Else
        {
        Write-Host "Unable to remove $rmmanager as a manager. Please try again." -F Red
        }
        ""
    Pause
    }
}

#########################################################################################################################################################
## End
#########################################################################################################################################################
}
Until ($rmselection -eq "8")
}Until ($rmselection -eq "9")
Remove-Variable rm* -Force
Exit