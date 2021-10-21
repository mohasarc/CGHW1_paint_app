import { Grid, Card, CardHeader, CardContent, Button, styled, ButtonProps, Box, Divider } from '@mui/material';
import BrushOutlinedIcon from '@mui/icons-material/BrushOutlined';
import SelectAllOutlinedIcon from '@mui/icons-material/SelectAllOutlined';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
import RedoOutlinedIcon from '@mui/icons-material/RedoOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';

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
                <Button>
                    <SaveOutlinedIcon sx={{color:'white'}}/>
                </Button>
                <Button>
                    <UploadFileOutlinedIcon sx={{color:'white'}}/>
                </Button>
            </CardContent>
        </Card>
    );
}