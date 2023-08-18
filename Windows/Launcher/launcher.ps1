<#############################################################################################################################################################

Author: Jeremy Zuehsow
Description: Launch menu for scripts

#############################################################################################################################################################>

Set-Location $PSScriptRoot
.".\Config\Common.ps1"
$version = '1.0'

Start_Script

$mainGroups = (Get-ChildItem -Directory).Name
Do
{
    
    #List groups with numbers to select i.e. 1. Active Directory
    #Select a group to open

}
Until ($mainSelect)

$subGroups = (Get-ChildItem -path .\$mainSelect -Directory).Name
Do
{
    
    #List groups with numbers to select i.e. 1. Active Directory
    #Select a group to open

}
Until ($subSelect)

$scripts = (Get-ChildItem -path .\$mainSelect\$subSelect).Name
Do
{
    
    #List groups with numbers to select i.e. 1. Active Directory
    #Select a group to open

}
Until ($scriptSelect)

#Execute script in background in new window