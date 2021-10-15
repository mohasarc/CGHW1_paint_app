import "./styles.css";
import { Container, Grid } from "@mui/material";

export default function App() {
  return (
    <div className="App">
      <Container maxWidth="lg" > 
        <Grid container rowSpacing={1} columns={{ xs: 12, sm: 12, md: 12 }} columnSpacing={{ xs: 1, sm: 2, md: 3 }}>
          
          <Grid item xs={12} sm={6} md={2}>
            <h2>Start editing to see some magic happen!</h2>
          </Grid>

          <Grid item xs={12} sm={6} md={8}>
            <canvas/>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <h1>Hello CodeSandbox</h1>
          </Grid>
        
        </Grid>
      </Container>
    </div>
  );
}
