
#This script needs rework


#Import CSV and check whether a machine is online and uses PSTools psshutdown.exe to shutdown machine. Computer's VLAN is changed to a new VLAN and moved to new OU.
#List Prereqs for user - csv list + format, original/new ou, original/new vlan (if applicable)
#Import csv list
 #get first computer, test against AD - Good=Continue
 #do this until computer is imported
#get variables required for transferred (read-host) 
#import computers - display statistics
#begin transfer - progress bar, status list
#pause, repeat until complete or 5 attempts

Import-Module ActiveDirectory
$ErrorActionPreference = "SilentlyContinue"
$compList = Import-Csv .\Comps.csv
$date = Get-Date -Format yyyyMMdd-HHmm
$oldOU = "OU=Computers,OU=Helpdesk,OU=Site,OU=Region,DC=contoso,DC=com"
$newOU = "OU=Sub_Comp_OU,OU=Computers,OU=Helpdesk,OU=Site,OU=Region,DC=contoso,DC=com"
$oldVLAN = "OLD_VLAN"
$newVLAN = "NEW_VLAN"

ForEach ($comp in $compList)
{
    $rmNewName = $comp.NewName

    if (Test-Connection $rmNewName -Count 1 -Quiet)
    {
        Do 
        {
            .\psshutdown.exe -s -t 0 -f \\$rmNewName
            Start-Sleep 60
        }
        Until (!(Test-Connection $rmNewName -Count 1 -Quiet))
        $rmStatus = "$newName Online, Shutdown - $date"
    }
    else {$rmStatus = "$newName Offline - $date"}
    Write-Host $rmStatus
    $rmStatus | Out-File -Encoding unicode -FilePath ".\MoveLog - $date.txt" -Append

    $rmSam = (Get-ADComputer -Identity $rmNewName).SamAccountName

    #NEED REVIEW OF -ne/-contains in UNTIL; REVIEW PATH OUTPUT
    Do {Remove ADGroupMember $oldVLAN - Members $rmSam -Confirm:$false}
    Until (Get-ADPrincipalGroupMembership $oldVLAN -ne $rmSam)
    Do {Add-ADGroupMember $newVLAN -Members $rmSam -Confirm:$false}
    Until (Get-ADPrincipalGroupMembership $newVLAN -contains $rmSam)
    Do {Get-ADComputer -Identity $rmSam | Move-ADObject -TargetPath $newOU}
    Until (Get-ADComputer -Identity $rmSam | ($_.PATH -eq "$newOU\$rmSam"))

    $rmMVStatus = "$rmNewName moved to [SITE] OU - $date"

    Write-Host $rmMVStatus
    $rmMVStatus | Out-File -Encoding unicode -FilePath ".\MoveLog - $date.txt" -Append
}
