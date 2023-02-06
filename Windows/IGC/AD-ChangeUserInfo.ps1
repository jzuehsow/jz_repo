<###############################################################################################################################

Created by Jeremy Zuehsow, 10/15/2016

The purpose of this script is to import user data from a spreadsheet and update in AD.

###############################################################################################################################>


."[PATH]]\Config\Common.ps1"
$version = '1.0'

Start_Script
Write_Banner

Import-Module ActiveDirectory
Get-Variable -Exclude PWD,*Preference | Remove-Variable -ErrorAction 0
$ErrorActionPreference = 'SilentlyContinue'
$userList = Import-Csv '.\Input\users.csv'

ForEach ($user in $userList)
{
    $rmName = $user.name
    $rmTitle = $user.title
    $rmDepartment = $user.Department
    $rmCompany = [COMPANY_NAME]
    $rmManager = (Get-ADUser $user.Manager).DistinguishedName
    $rmOffice = $user.office
    $rmOfficePhone = $user.officePhone
    $rmCellPhone = $user.MobilePhone
    $rmCity = $user.city
    $rmStreet = $user.street
    $rmState = $user.state
    $rmZip = $user.zip
    $rmPOBox = $userPOBox
    $rmCountry = $user.country
    $rmUserData = (Get-ADUser $name -Properties *)
    $rmSAM = $userData.samAccountName
    $rmDescription = $city + '-' + $title

    Set-ADUser $rmSam -Name $rmName -Title $rmTitle -Department $rmDepartment -Company $rmCompany -Manager $rmManager -Office $rmOffice `
    -OfficePhone $rmOfficePhone -MobilePhone $rmCellPhone -Description $rmDescription -StreetAddress $rmStreet -POBox $rmPOBox -State $rmState -City $rmCity -Country $rmCountry -PostalCode $rmZip
    Clear-Variable rm* -Force
}

Stop_Script