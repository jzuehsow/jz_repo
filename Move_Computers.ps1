
#This script needs major rework


#Import CSV and check whether a machine is online and uses PSTools psshutdown.exe to shutdown machine. Computer's VLAN is changed to a new VLAN and moved to new OU.
#List Prereqs for user - csv list + format, original/new ou, original/new vlan (if applicable)
#Import csv list
 #get first computer, test against AD - Good=Continue
 #do this until computer is imported
#get variables required for transferred (read-host) 
#import computers - display statistics
#begin transfer - progress bar, status list
#pause, repeat until complete or 5 attempts



Import-Module ActiveDirectory
$ErrorActionPreference = "SilentlyContinue"
$compList = Import-Csv .\Comps.csv
$date = Get-Date -Format yyyyMMdd-HHmm
$OldOU = "OU=Computers,OU=[HA OU],OU=[SITE],OU=[REGION],DC=contoso,DC=com"
$NewOU = "OU=[SUB OU],OU=Computers,OU=[HA OU],OU=[REGION],DC=contoso,DC=com"
$OldVLAN = "[OLD VLAN]"
$NewVLAN = "[NEW VLAN]"


foreach($item in $compList)
{
    $NewName = $item.NewName
    $OnlineOutput = "$NewName Online, Shut Down - $date"
    $OfflineOutput = "$NewName Offline - $date"
    $Online = Test-Connection $NewName -Count 1 -Quiet
 
    if($Online -eq $true)
    {
        .\psshutdown.exe -s -t 0 -f \\$NewName
        Write-Host $OnlineOutput
        $OnlineOutput | Out-File -Encoding unicode -FilePath ".\MoveLog - $date.txt" -Append
    }
    else
    {
        Write-Host $OfflineOutput
        $OfflineOutput | Out-File -Encoding unicode -FilePath ".\MoveLog - $date.txt" -Append
    }
}
 
foreach($item in $compList)
{
    $NewName = $item.NewName
    $SAMAccountName = (Get-ADComputer -Identity $NewName).SAMAccountName
    $OnlineOutput = "$NewName moved to FNTY OU - $date"
   
    Remove-ADGroupMember $OldVLAN -Members $SAMAccountName -Confirm:$false
    Add-ADGroupMember $NewVLAN -Members $SAMAccountName -Confirm:$false
    Get-ADComputer -Identity $NewName | Move-ADObject -TargetPath $NewOU
    Write-Host $OnlineOutput
    $OnlineOutput | Out-File -Encoding unicode -FilePath ".\MoveLog - $date.txt" -Append
}



