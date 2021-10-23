import { Card, CardContent, Button } from '@mui/material';
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
import RedoOutlinedIcon from '@mui/icons-material/RedoOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import FileUploadIcon from '@mui/icons-material/FileUpload';

import { StateManager } from '../util/StateManager'

export default function ToolBar() {
    return(
        <Card>
            <CardContent style={{backgroundColor: '#3b4245'}}>
                <Button>
                    <UndoOutlinedIcon sx={{color:'white'}}/>
                </Button>
                <Button>
                    <RedoOutlinedIcon sx={{color:'white'}} />
                </Button>
                <Button onClick={downloadObjectAsJson}>
                    <SaveOutlinedIcon sx={{color:'white'}}/>
                </Button>
                <Button component="label">
                <FileUploadIcon sx={{color:'white'}}/>
                <input
                    type="file"
                    hidden
                    onChange={changeHandler}
                />
                </Button>
            </CardContent>
        </Card>
    );
}

// Src = https://stackoverflow.com/questions/19721439/download-json-object-as-a-file-from-browser
function downloadObjectAsJson() {
    const data = StateManager.getInstance().serialize();
    const exportName = 'Drawing';
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');

    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".meg");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function changeHandler(event: any) {
    const fileReader = new FileReader();

    fileReader.onload = () => {
        if (fileReader.result && typeof fileReader.result === 'string')
            StateManager.getInstance().initWith(fileReader.result);
    }

    fileReader.readAsText(event.target.files[0]);
};
