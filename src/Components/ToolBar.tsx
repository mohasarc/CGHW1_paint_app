import { Box, Grid } from "@mui/material";

export default function ToolBar() {
    return(
        <Box
            sx={{ width: '100%', height: 50, maxWidth: 350 }}
        >
            <Grid container rowSpacing={1} columns={{ xs: 12, sm: 12, md: 12 }} >
                <Grid item xs={3} sm={3} md={3} style={{padding: 0}}>
                </Grid>
            </Grid>
        </Box>
    );
}