import * as fs from 'fs'
import { exit } from 'process'

// ----------------------- Constants -----------------------------//
const NUM_OF_LINES_PER_WEBSITE = 3
const ForeThemeVer = '2020.1'
const ForeThemeStatus = 'parent'
const ChildVer = '1.0.0'
const ChildStatus = 'active'
const AdsStatus = 'yes'
// ----------------------------------------------------------------


// This Function just remove from a string a given substring
const remove_part_of_string = (string,remove) => {
    return string.replace(remove,'')
}

// This function make sure a string can be turned into json
function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

//--------------------------------------------------
// ----------- Logic Starts Here --------------------
//--------------------------------------------------

// 1) Read the file.log
let log = fs.readFileSync('./logfile/file.log','utf-8', (error) => {
    if(error) return false
})


// 2) If read the log file succsesfuly, remove all the unwanted ASCII letters in order to make it readable
// if its not working there is a possibily that the source of the log file has changed.
// this logic is very specific to log file of AppManager application that been written by Vlad in python.

let newarray = [] // where all the lines will be stored

if(log) {

    // split the file lines into array (serach for '] or "]) , it will find one of them at the end of each line
    log = log.split(new RegExp('(\']|"])', 'g')) 

    for(let i in log) {

        // remove ASCII letters
        let modifed_value = remove_part_of_string(log[i],'[b')
        modifed_value = remove_part_of_string(modifed_value,'\r\n')
        modifed_value = remove_part_of_string(modifed_value,'\\n')
        modifed_value = remove_part_of_string(modifed_value,'\\n') // needed twice
        modifed_value = remove_part_of_string(modifed_value,',')
        modifed_value = modifed_value.replace('.net', '.net,')
        modifed_value = modifed_value.replace('.com', '.com,')
        modifed_value = remove_part_of_string(modifed_value,"b'")

        // with this if statement we make sure that no empty lines or other leftovers as '] or "] will enter the next stage
        if(modifed_value.length > 2 ) {
            newarray.push(modifed_value)
        }     
    }

}
else {
    console.log(('Error with log file, exiting'))
    exit()
}


// 3) Each website has number of lines that is related to him, we check after step 2
// that everything went ok and we have the number of lines that we expect.
// the number of lines of each website is on const NUM_OF_LINES_PER_WEBSITE
if(newarray.length % NUM_OF_LINES_PER_WEBSITE !== 0) {
    console.log('\n---------------ERROR------------------')
    console.log('The line splitting was not succsesful, you have to manually fix it\n')

    for(let index in newarray) {
        console.log(`line ${parseInt(index)+1}: ${newarray[index]}\n`)
    }
    exit()
}

// 4) In This step we take the related lines of each website and push the information into a Object.
// also there are more ASCII letters being removed
let final_array = []

for(let i=0; i<newarray.length; i+=NUM_OF_LINES_PER_WEBSITE) {
    let temp_object = {}

    // push the site URL into the object
    temp_object['url'] = newarray[i].split(',',1)[0] 

    // More cleaning, after the extra cleaning checks if can be converted into json, if true converts, else return a normal string
    // handle the ForeTheme main template information
    if(IsJsonString(newarray[i].replace(temp_object['url'],'').replace(',','').replace("'",'').trim())) {
        temp_object['main'] = JSON.parse(newarray[i].replace(temp_object['url'],'').replace(',','').replace("'",'').trim())
    }
    else {
        temp_object['main'] = newarray[i].replace(temp_object['url'],'').replace(',','').replace("'",'').trim()
    }

    // More cleaning, after the extra cleaning checks if can be converted into json, if true converts, else return a normal string
    // handle the ForeTheme-child template information
    if(IsJsonString(newarray[i+1].replace(temp_object['url'],'').replace(',','').replace("'",'').trim())) {
        temp_object['child'] = JSON.parse(newarray[i+1].replace(temp_object['url'],'').replace(',','').replace("'",'').trim())
    }
    else {
        temp_object['child'] = newarray[i+1].replace(temp_object['url'],'').replace(',','').replace("'",'').trim()
    }
   
    // The Result of this string is 'yes' or 'no' in a string, the meaning is if a ads.txt file exist on the wordpress site.
    temp_object['ads'] = newarray[i+2].replace(temp_object['url'],'').replace(',','').replace("'",'').trim().replace(`ads.txt',`,'').trim()

    // push into the array the object
    final_array.push(temp_object)
}

// 5) Data analazying, for each site in final_array (a site is a typeof Object).
// compare the values in the Object to the values that we want, after the analayzing is finished
// its push into fina.txt all the data in a unpretty way, we fix this on next step.
let final_data = []
for(let site of final_array) {

    let error = false
    let cause_of_error = []

    if(site.main.version !== ForeThemeVer) {error = true, cause_of_error.push(`ForeTheme Version is bad: ${site.main.version}, required: ${ForeThemeVer}`)}
    if(site.main.status !== ForeThemeStatus) {error = true, cause_of_error.push(`ForeTheme Status is wrong: ${site.main.status}, required: ${ForeThemeStatus}`)}
    if(site.child.version !== ChildVer) {error = true, cause_of_error.push(`Child Version is bad: ${site.child.version}, required: ${ChildVer}`)}
    if(site.child.status !== ChildStatus) {error = true, cause_of_error.push(`Child Status is wrong: ${site.child.status}, required: ${ChildStatus}`)}
    if(site.ads !== AdsStatus) {error = true, cause_of_error.push('ads.txt file dont exist')}

    // data variable is being pushed to the final.txt file
    let data = {url: site.url}

    if(error) {
        data.status = 'error'
        data.triggers = cause_of_error
    }
    else {
        data.status = 'ok'
    }
    
    final_data.push(data)

    fs.writeFileSync('final.txt',JSON.stringify(data),{encoding: 'utf-8', flag: 'a+'},(error)=> {
        if(error) print('error in writing final.txt')
        return
    })
}

// 6) If you remove this step, everything will still work.
// The purpose of this step is to read the file, enter a new line ASCII between each line in order to make it readable
// and then overwrite the file with the more readable data.
    let final_file = fs.readFileSync('final.txt',{encoding: 'utf-8'}) //read

    final_file = final_file.replace(/}/g,'}\n') // adding new line ASCII

    //overwrite
    fs.writeFileSync('final.txt',final_file,{encoding: 'utf-8', flag: 'w'}, (error) => {
        if(error) print('error in writing final.txt')
        return
    })
