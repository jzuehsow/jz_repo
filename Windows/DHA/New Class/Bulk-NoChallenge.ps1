<#############################################################################################################################################################

Author - Jeremy Zuehsow
Purpose - Add bulk users from csv to MFA exemption

Change Log:
v2.1 - Modifications to script per Exchange team request



#############################################################################################################################################################>


$csvPath = "[NEW CLASS CSV LIST]"
$MFAExemptGroup = '[MFA EXEMPT GROUP]'

$csv = Import-Csv $csvPath

ForEach ($rmLine in $csv)
{
    $rmSam = $rmLine.SamAccountName
    $rmUser = Get-ADUser $rmSam
    Set-ADUser $rmUser -Replace @{Attribute1="RSA_PERM"}
    Set-ADUser $rmUser -Replace @{Attribute1Description="MFA Exempt"}
    Add-ADGroupMember $MFAExemptGroup $rmUser

    Remove-Variable -Name "rm*" -Force
}
