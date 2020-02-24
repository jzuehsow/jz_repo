

Import-Module ActiveDirectory
Get-Variable -Exclude PWD,*Preference | Remove-Variable -ErrorAction 0
$ErrorActionPreference = 'SilentlyContinue'
$userList = Import-Csv '.\Input\users.csv'

ForEach ($user in $userList)
{
    $rmName = $user.name
    $rmTitle = $user.title
    $rmDepartment = $user.Department
    $rmCompany = [COMPANY NAME]
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

    Set-ADUser $sam -Title $rmTitle -Department $rmDepartment -Company $rmCompany -Manager $rmManager -Office $rmOffice `
    -OfficePhone $rmOfficePhone -MobilePhone $rmCellPhone -Description $rmDescription -StreetAddress $rmStreet -POBox $rmPOBox -State $rmState -PostalCode $rmZip
    Clear-Variable rm* -Force
}