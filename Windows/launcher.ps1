<###############################################################################################################################

Author: Jeremy Zuehsow

Purpose: Build the menu for launching scripts.

Change Log: 

COMPLETE > Get Tool Directories > Select Directory > Get Tools/Scripts > Select Tool/Script > Create New PS Windows & exe

###############################################################################################################################>


Remove-variable * -ErrorAction 'SilentlyContinue'
Set-Location $PSScriptRoot
."..\Config\Common.ps1"
$version = '1.0'

Start_Script

Function getMenu
{
    $i = 0
    ForEach ($item in $items)
    {
        $i++
        New-Variable opt$i -Value $item
        Write-Host "`t$i. $item" -F Magenta
    }

    Write-Host "`nSelect a menu item" -F Yellow -NoNewline
    $rmChoice = Read-Host " "
    $rmSelection = Get-Variable opt$rmChoice -ValueOnly

    If (!($rmSelection)) {Write-Host "Invalid Selection" -F Red}
    Else {$Script:selection = $rmSelection}
}


Function mainMenu
{
    Do
    {
        $toolDirs = (Get-ChildItem * -Directory -Recurse).Name | Where-Object {$_ -like "*Tools*"} | Sort
        getMenu
    }
    Until ($selection)
}

Function subMenu
{
    Do
    {
        $tools = (Get-ChildItem "./$selection").Name | Sort

        $i = 0
        ForEach ($tool in $tools)
        {
            $i++
            New-Variable opt$i -Value $tool
            Write-Host "`t$i. $tool" -F Magenta
        }

        Write-Host "`nSelect a menu item" -F Yellow -NoNewline
        $rmChoice = Read-Host " "
        $rmSelection = Get-Variable opt$rmChoice -ValueOnly

        If (!($rmSelection)) {Write-Host "Invalid Selection" -F Red}
        Else {$Script:selection = $rmSelection}
        Remove-Variable rm* -Force
    }
    Until ($selection)
}

Do
{
    mainMenu
    subMenu ($selection)
    ".\$selection"
}
Until ($true)

Stop_Script