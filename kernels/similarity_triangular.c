#include <math.h>
#include <stdlib.h>

void cosine_similarity_matrix_optimized(
    float *embeddings,  // [N x D] flattened
    float *result,      // [N x N] output
    int N, int D
) {
    #pragma acc data copyin(embeddings[0:N*D]) copyout(result[0:N*N])
    {
        // We only parallelize the outer loop now, dropping collapse(2)
        #pragma acc parallel loop
        for (int i = 0; i < N; i++) {
            
            // The diagonal: an article compared to itself is always 1.0
            result[i * N + i] = 1.0f;
            
            // The inner loop starts at i + 1! No useless self or backward comparisons.
            #pragma acc loop
            for (int j = i + 1; j < N; j++) {
                float dot = 0.0f, norm_i = 0.0f, norm_j = 0.0f;
                
                #pragma acc loop reduction(+:dot,norm_i,norm_j)
                for (int k = 0; k < D; k++) {
                    float a = embeddings[i * D + k];
                    float b = embeddings[j * D + k];
                    dot    += a * b;
                    norm_i += a * a;
                    norm_j += b * b;
                }
                
                float sim = dot / (sqrtf(norm_i) * sqrtf(norm_j) + 1e-8f);
                
                // Write the answer to BOTH sides of the matrix symmetrically 
                result[i * N + j] = sim;
                result[j * N + i] = sim; 
            }
        }
    }
}