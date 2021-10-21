import { Grid, Card, CardHeader, CardContent, Button, styled, ButtonProps, Box, Divider } from '@mui/material';

export default function WorkArea() {
    return (
        <Card>
            <CardContent style={{backgroundColor: '#3b4245'}}>
                <canvas id={'macanvas'} width={'520'} height={'550'} />
            </CardContent>
        </Card>
    );
}